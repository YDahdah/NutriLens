import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Database, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const DatabaseSetupGuide = () => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const setupCommands = `# 1. Install MySQL
# Download from: https://dev.mysql.com/downloads/mysql/

# 2. Start MySQL service (Windows)
net start mysql

# 3. Create database
mysql -u root -p < database_schema.sql

# 4. Update config.env with your credentials
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=nutrilens`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(setupCommands);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Setup commands copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Database className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Database Setup Required</AlertTitle>
      <AlertDescription className="text-amber-700 mt-2">
        <p className="mb-3">
          To use authentication features, you need to set up a MySQL database. 
          The application is currently running in development mode without database connectivity.
        </p>
        
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-amber-800 mb-2">Quick Setup:</h4>
            <div className="bg-amber-100 p-3 rounded-md font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">{setupCommands}</pre>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="mt-2"
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Commands"}
            </Button>
          </div>
          
          <div className="text-sm">
            <p className="mb-2">
              <strong>Alternative:</strong> The app works without database for frontend testing, 
              but authentication features will be disabled.
            </p>
            <p>
              <strong>Need help?</strong> Check the README.md file in the backend directory for detailed instructions.
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DatabaseSetupGuide;
