import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Parsers a PDF file client-side and extracts all text.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const parsePdf = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      try {
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        resolve(fullText.trim());
      } catch (error) {
        console.error('PDF parsing error:', error);
        reject(new Error('Failed to parse PDF. The file might be corrupted or scanned.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parses a DOCX file client-side and extracts all text.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const parseDocx = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value.trim());
      } catch (error) {
        console.error('DOCX parsing error:', error);
        reject(new Error('Failed to parse Word document. The file might be corrupted.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
