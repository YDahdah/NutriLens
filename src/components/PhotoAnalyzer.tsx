import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Upload, X, Loader2, UtensilsCrossed, Plus, RefreshCw, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { VisionService, VisionResult } from "@/services/VisionService";
import { apiClient } from "@/utils/apiClient";

interface PhotoAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PhotoAnalyzer = ({ isOpen, onClose }: PhotoAnalyzerProps) => {
  const [showOptions, setShowOptions] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Countdown timer for rate limit retry
  useEffect(() => {
    if (rateLimitUntil && rateLimitUntil > Date.now()) {
      // Set initial countdown
      const initialRemaining = Math.ceil((rateLimitUntil - Date.now()) / 1000);
      setRetryCountdown(initialRemaining > 0 ? initialRemaining : 0);
      
      const interval = setInterval(() => {
        const remaining = Math.ceil((rateLimitUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setRetryCountdown(remaining);
        } else {
          setRetryCountdown(0);
          setRateLimitUntil(null);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setRetryCountdown(0);
    }
  }, [rateLimitUntil]);

  const handleUploadClick = () => {
    setShowOptions(false);
    fileInputRef.current?.click();
  };

  const handleTakePhotoClick = () => {
    setShowOptions(false);
    startCamera();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setShowOptions(true);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setPhotoFile(file);
            setPhotoPreview(canvas.toDataURL());
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setPhotoFile(file);
        setErrorMessage(null); // Clear any previous errors
        setResult(null); // Clear any previous results
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleClose = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setResult(null);
    setErrorMessage(null);
    setShowOptions(true);
    stopCamera();
    onClose();
  };

  const handleRetake = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setResult(null);
    setErrorMessage(null);
    setShowOptions(true);
    stopCamera();
  };

  const sendToAIChat = async (analysisResult: VisionResult, imagePreview: string | null) => {
    try {
      // Format the analysis results into a message for the AI
      const itemsList = analysisResult.items?.map(item => 
        `- ${item.name}${item.calories ? ` (~${item.calories} calories)` : ''}`
      ).join('\n') || 'No items detected';
      
      const totalCalories = Math.round(
        (analysisResult.items || []).reduce((sum, it) => sum + (it.calories || 0), 0)
      );
      
      let message = `I just analyzed a meal photo. Here's what I found:\n\n`;
      
      if (analysisResult.dish_name) {
        message += `Dish: ${analysisResult.dish_name}\n\n`;
      }
      
      message += `Food items detected:\n${itemsList}\n\n`;
      
      if (totalCalories > 0) {
        message += `Total estimated calories: ~${totalCalories} kcal\n\n`;
      }
      
      if (analysisResult.summary) {
        message += `Summary: ${analysisResult.summary}\n\n`;
      }
      
      message += `Please provide detailed nutritional insights about this meal, including:\n`;
      message += `- Overall nutritional value\n`;
      message += `- Health benefits of the main ingredients\n`;
      message += `- Suggestions for making it healthier if needed\n`;
      message += `- How this meal fits into a balanced diet`;
      
      // Store the message and image in sessionStorage to pass to chat
      const chatData = {
        message: message,
        imagePreview: imagePreview,
        analysisResult: analysisResult
      };
      sessionStorage.setItem('photoAnalysisForChat', JSON.stringify(chatData));
      
      // Navigate to chat page
      onClose();
      navigate('/chat');
      
      toast({
        title: "Sending to AI Chat",
        description: "Your meal analysis is being sent to the AI nutritionist for detailed insights.",
      });
    } catch (error: any) {
      console.error('Error sending to AI chat:', error);
      toast({
        title: "Error",
        description: "Could not send to AI chat. You can manually copy the analysis.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Analyze Your Meal Photo</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Upload a photo or take a new picture to analyze your meal. Only food-related images will be accepted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showOptions && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                variant="outline"
                className="flex-1 h-24 sm:h-32 flex-col gap-2"
                onClick={handleUploadClick}
              >
                <Upload className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="text-sm sm:text-base">Upload Photo</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-24 sm:h-32 flex-col gap-2"
                onClick={handleTakePhotoClick}
              >
                <Camera className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="text-sm sm:text-base">Take Photo</span>
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!showOptions && !photoPreview && (
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                  style={{ display: photoPreview ? 'none' : 'block' }}
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={capturePhoto}
                  className="flex-1"
                  variant="default"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Photo
                </Button>
                <Button
                  onClick={handleRetake}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {photoPreview && (
            <div className="space-y-6">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[200px]">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-auto max-h-[300px] object-contain"
                />
                <Button
                  onClick={handleRetake}
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {errorMessage && (
                <Alert variant="destructive">
                  {(errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('daily free model limit')) ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <UtensilsCrossed className="h-4 w-4" />
                  )}
                  <AlertTitle className="flex items-center gap-2">
                    {(errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('daily free model limit')) 
                      ? 'Rate Limit Reached' 
                      : 'Error'}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="whitespace-pre-wrap text-sm">{errorMessage}</div>
                    {(errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('daily free model limit') || errorMessage.toLowerCase().includes('too many requests')) && (retryCountdown > 0 || rateLimitUntil !== null) && (
                      <div className="mt-3 pt-3 border-t border-destructive/20">
                        <p className="text-xs text-muted-foreground mb-2">
                          Retry available in: <span className="font-mono font-semibold">{Math.floor(retryCountdown / 60)}:{(retryCountdown % 60).toString().padStart(2, '0')}</span>
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            if (!photoFile || retryCountdown > 0) return;
                            setIsAnalyzing(true);
                            setErrorMessage(null);
                            setResult(null);
                            try {
                              const r = await VisionService.analyzePhoto(photoFile);
                              setResult(r);
                              setRateLimitUntil(null);
                              const total = Math.round(
                                (r.items || []).reduce((sum, it) => sum + (it.calories || 0), 0)
                              );
                              toast({
                                title: "Analysis Complete",
                                description: total ? `Estimated total: ~${total} kcal. Sending to AI for detailed insights...` : "Detected items updated. Sending to AI...",
                              });
                              setTimeout(async () => {
                                await sendToAIChat(r, photoPreview);
                              }, 1000);
                            } catch (e: any) {
                              const errorMsg = e?.message || "Unable to analyze photo. Please try again.";
                              setErrorMessage(errorMsg);
                            } finally {
                              setIsAnalyzing(false);
                            }
                          }}
                          disabled={retryCountdown > 0 || isAnalyzing}
                          className="w-full"
                        >
                          {retryCountdown > 0 ? (
                            <>
                              <Clock className="h-3 w-3 mr-2" />
                              Wait {retryCountdown}s
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2" />
                              Retry Analysis
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {!errorMessage.toLowerCase().includes('rate limit') && !errorMessage.toLowerCase().includes('daily free model limit') && (
                      <p className="mt-2 text-sm">
                        Please upload an image that contains food or beverages.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {result && (
                <div className="rounded-lg border bg-white p-6 space-y-4">
                  {result.dish_name && (
                    <div className="border-b pb-3">
                      <h3 className="font-semibold text-xl text-gray-900">{result.dish_name}</h3>
                    </div>
                  )}
                  
                  {result.items?.length > 0 && (
                    <div className="space-y-3">
                      <p className="font-semibold text-base text-gray-900">Ingredients & Items:</p>
                      <div className="space-y-2">
                        {result.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
                            <span className="text-gray-800 font-medium">{it.name}</span>
                            <span className="text-gray-600 font-medium">
                              {typeof it.calories === 'number' ? `~${it.calories} kcal` : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between bg-green-50 rounded-md p-3">
                          <span className="font-semibold text-gray-900">Total Calories:</span>
                          <span className="font-bold text-xl text-green-700">
                            ~{Math.round(result.items.reduce((sum, it) => sum + (it.calories || 0), 0))} kcal
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {result.summary && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600 italic">{result.summary}</p>
                    </div>
                  )}
                  
                  {result.recipe && (
                    <div className="pt-3 border-t">
                      <p className="font-semibold mb-2 text-gray-900">Recipe: {result.recipe.title}</p>
                      {typeof result.recipe.estimatedCalories === 'number' && (
                        <p className="text-gray-700 font-medium">~{result.recipe.estimatedCalories} kcal</p>
                      )}
                    </div>
                  )}
                  
                  {result.items && result.items.length > 0 && (
                    <Button
                      onClick={() => {
                        // Store items in sessionStorage to pass to tracker
                        const itemsToAdd = result.items.map(item => ({
                          name: item.name,
                          calories: item.calories || 0,
                          // Default values for other nutrition fields
                          protein: 0,
                          carbs: 0,
                          fat: 0,
                          fiber: 0,
                        }));
                        const dataToStore = {
                          items: itemsToAdd,
                          dishName: result.dish_name || null,
                        };
                        
                        sessionStorage.setItem('photoAnalyzerItems', JSON.stringify(dataToStore));
                        
                        // Dispatch custom event to notify tracker
                        window.dispatchEvent(new CustomEvent('photoItemsReady'));
                        
                        // Small delay before navigation to ensure event is processed
                        setTimeout(() => {
                          onClose();
                          navigate('/tracker');
                        }, 100);
                        
                        toast({
                          title: "Items Ready to Add",
                          description: `Adding ${itemsToAdd.length} item(s) to your meal...`,
                        });
                      }}
                      className="w-full mt-4 h-10 sm:h-11 text-sm sm:text-base font-semibold"
                      variant="default"
                    >
                      <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Add to Today's Meal
                    </Button>
                  )}
                </div>
              )}
              
              {!result && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={async () => {
                      if (!photoFile) return;
                      setIsAnalyzing(true);
                      setErrorMessage(null);
                      setResult(null);
                      try {
                        const r = await VisionService.analyzePhoto(photoFile);
                        setResult(r);
                        const total = Math.round(
                          (r.items || []).reduce((sum, it) => sum + (it.calories || 0), 0)
                        );
                        toast({
                          title: "Analysis Complete",
                          description: total ? `Estimated total: ~${total} kcal. Sending to AI for detailed insights...` : "Detected items updated. Sending to AI...",
                        });
                        
                        // Automatically send to AI chat for detailed analysis
                        // Small delay to show the result briefly, then send to AI
                        setTimeout(async () => {
                          await sendToAIChat(r, photoPreview);
                        }, 1000);
                      } catch (e: any) {
                        const errorMessage = e?.message || "Unable to analyze photo. Please try again.";
                        
                        // Check if it's a non-food image rejection (400 status)
                        if (e?.status === 400 || (errorMessage.toLowerCase().includes('not appear to contain food'))) {
                          setErrorMessage(errorMessage);
                          toast({
                            title: "Non-Food Image Detected",
                            description: errorMessage.includes('does not support image analysis') 
                              ? "The AI model doesn't support image analysis. Please contact support or try again later."
                              : errorMessage || "Please upload an image that contains food or beverages.",
                            variant: "destructive",
                          });
                        } else if (e?.status === 429 || errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('daily free model limit') || errorMessage.toLowerCase().includes('too many requests')) {
                          // Rate limit error
                          const isFreeLimit = errorMessage.toLowerCase().includes('free model limit') || errorMessage.toLowerCase().includes('free-models-per-day') || errorMessage.toLowerCase().includes('daily free model limit');
                          
                          // Format error message for display
                          let formattedMessage = errorMessage;
                          if (errorMessage.includes('\n')) {
                            // Split multi-line messages and format nicely
                            const lines = errorMessage.split('\n').filter(line => line.trim());
                            formattedMessage = lines.map((line, idx) => {
                              const trimmed = line.trim();
                              if (idx === 0) return trimmed;
                              // Format bullet points
                              if (trimmed.startsWith('•') || trimmed.match(/^\d+\./)) return `  ${trimmed}`;
                              return `  • ${trimmed}`;
                            }).join('\n');
                          }
                          
                          setErrorMessage(formattedMessage);
                          
                          // Set retry timer (5 minutes for free limit, 2 minutes for general rate limit)
                          const retryDelay = isFreeLimit ? 5 * 60 * 1000 : 2 * 60 * 1000;
                          const untilTime = Date.now() + retryDelay;
                          setRateLimitUntil(untilTime);
                          setRetryCountdown(Math.ceil(retryDelay / 1000)); // Set initial countdown immediately
                          
                          toast({
                            title: isFreeLimit ? "Daily Free Limit Reached" : "Rate Limit Reached",
                            description: isFreeLimit
                              ? "You've reached OpenRouter's daily free model limit. The system tried all available models (GPT-5.1, GPT-4o, Gemini) but all are rate-limited.\n\nOptions:\n• Wait until tomorrow (limit resets daily)\n• Add credits at openrouter.ai/credits\n• Use a different API key with credits"
                              : `Rate limit reached on all models. Please wait ${Math.ceil(retryDelay / 60000)} minutes before retrying.`,
                            variant: "destructive",
                            duration: 15000, // Show for 15 seconds
                          });
                        } else if (errorMessage.toLowerCase().includes('does not support image analysis') || 
                                   errorMessage.toLowerCase().includes('provider returned error')) {
                          // Model compatibility error
                          setErrorMessage(errorMessage);
                          toast({
                            title: "Model Compatibility Error",
                            description: errorMessage.includes('does not support image analysis')
                              ? errorMessage
                              : "The AI model doesn't support image analysis. Please contact support or try again later.",
                            variant: "destructive",
                          });
                        } else if (errorMessage.toLowerCase().includes('timeout') || 
                                   errorMessage.toLowerCase().includes('taking longer')) {
                          // Timeout error
                          setErrorMessage(errorMessage);
                          toast({
                            title: "Analysis Taking Too Long",
                            description: errorMessage.includes('taking longer than expected')
                              ? errorMessage
                              : "The analysis is taking longer than expected. This might be due to a complex image or high server load. Please try again with a simpler image or wait a moment.",
                            variant: "destructive",
                          });
                        } else {
                          setErrorMessage(errorMessage);
                          toast({
                            title: "Analysis Failed",
                            description: errorMessage,
                            variant: "destructive",
                          });
                        }
                      } finally {
                        setIsAnalyzing(false);
                      }
                    }}
                    disabled={isAnalyzing}
                    className="flex-1 w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
                    variant="default"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Analyze Meal
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    disabled={isAnalyzing}
                    className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoAnalyzer;

