import { read, utils } from 'xlsx';
import { analyzeDocument } from './openai';
import type { DataVisualization } from '../types';

interface AnalysisResult {
  summary: string;
  insights: string[];
  visualizations: DataVisualization[];
}

async function analyzeExcelContent(data: any[]): Promise<AnalysisResult> {
  const columns = Object.keys(data[0]);
  const sampleRows = data.slice(0, 5);
  
  const prompt = `You are a data analysis expert. Analyze the following dataset:

Dataset Preview:
Columns: ${columns.join(', ')}
Sample Rows:
${JSON.stringify(sampleRows, null, 2)}

Please provide:

1. A concise summary of the dataset
2. 3-5 key insights about patterns, trends, or notable findings
3. Recommended visualizations with specific data mappings

Format your response as valid JSON with this structure:
{
  "summary": "Brief dataset overview",
  "insights": ["Insight 1", "Insight 2", ...],
  "visualizations": [
    {
      "type": "bar",
      "title": "Chart title",
      "dataMapping": {
        "columns": ["column1", "column2"],
        "explanation": "How to use these columns"
      }
    }
  ]
}

IMPORTANT: Only use "bar" or "pie" for visualization types.`;

  const analysis = await analyzeDocument(prompt);
  const response = JSON.parse(analysis);

  // Transform the data based on AI recommendations
  const visualizations = response.visualizations
    .filter((viz: any) => viz && viz.type && viz.dataMapping && viz.dataMapping.columns)
    .map((viz: any) => {
      const { columns } = viz.dataMapping;
      
      // Create visualization data based on the recommended columns
      const vizData = data.reduce((acc: any[], row: any) => {
        const name = String(row[columns[0]] || '');
        const value = parseFloat(row[columns[1]]) || 0;
        
        if (!name) return acc;
        
        const existing = acc.find(item => item.name === name);
        if (existing) {
          existing.value += value;
        } else {
          acc.push({ name, value });
        }
        
        return acc;
      }, [])
      .filter(item => !isNaN(item.value) && item.name);

      return {
        type: viz.type === 'pie' ? 'pie' : 'bar', // Default to bar if type is invalid
        title: viz.title || 'Data Visualization',
        data: vizData
      };
    })
    .filter(viz => viz.data && viz.data.length > 0); // Only include visualizations with valid data

  return {
    summary: response.summary || 'Analysis complete',
    insights: response.insights || ['No specific insights found'],
    visualizations
  };
}

function preprocessData(jsonData: any[]): any[] {
  return jsonData.map(row => {
    const processed: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        processed[key] = '';
        continue;
      }
      
      // Convert percentage strings to numbers
      if (typeof value === 'string' && value.includes('%')) {
        processed[key] = parseFloat(value.replace('%', '')) || 0;
      }
      // Convert numeric strings to numbers
      else if (typeof value === 'string' && !isNaN(Number(value))) {
        processed[key] = Number(value) || 0;
      }
      // Keep other values as strings
      else {
        processed[key] = String(value);
      }
    }
    return processed;
  });
}

export async function processExcelFile(file: File): Promise<{ 
  data: any[]; 
  visualizations: DataVisualization[];
  analysis: {
    summary: string;
    insights: string[];
  };
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('Failed to read file content');
        }

        // 1. Excel Content Analysis
        const data = e.target.result;
        const workbook = read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        let jsonData = utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error('No data found in Excel file');
        }

        // 2. Content Re-organizing
        const processedData = preprocessData(jsonData);

        // 3 & 4. Content Analysis and Visualization Selection
        const analysis = await analyzeExcelContent(processedData);

        // 5. Making the Visualization
        resolve({ 
          data: processedData,
          visualizations: analysis.visualizations,
          analysis: {
            summary: analysis.summary,
            insights: analysis.insights
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to process Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}