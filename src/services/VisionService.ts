import { apiClient, ApiResponse } from '../utils/apiClient';

export interface AnalyzedItem {
  name: string;
  confidence?: number;
  calories?: number;
}

export interface AnalyzedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  estimatedCalories?: number;
}

export interface VisionResult {
  dish_name?: string | null;
  items: AnalyzedItem[];
  recipe?: AnalyzedRecipe | null;
  summary?: string;
}

export class VisionService {
  static async analyzePhoto(file: File): Promise<VisionResult> {
    const form = new FormData();
    form.append('file', file);
    const res: ApiResponse<VisionResult> = await apiClient.upload('/vision/analyze', form);
    if (!res.success) {
      throw new Error(res.message || 'Analysis failed');
    }
    return res.data as VisionResult;
  }
}


