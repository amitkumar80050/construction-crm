import * as pdfjsLib from 'pdfjs-dist';

// Serve the worker from our own public folder — no CDN, no bundler magic needed
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

class PDFParserService {
  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(file) {
    try {
      const arrayBuffer = await this.fileToArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Convert File to ArrayBuffer
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extract structured data from PDF text using regex patterns
   */
  extractLeadData(text) {
    const data = {
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      projectValue: '',
      notes: ''
    };

    // Common patterns for extracting information
    const patterns = {
      // Name patterns
      name: [
        /(?:Name|Client Name|Customer Name|Lead Name)[\s:]+([^\n,]+)/i,
        /(?:Contact|Contact Person)[\s:]+([^\n,]+)/i,
        /^([A-Z][a-z]+ [A-Z][a-z]+)/m
      ],
      
      // Company patterns
      company: [
        /(?:Company|Organization|Business|Firm)[\s:]+([^\n,]+)/i,
        /(?:Company Name)[\s:]+([^\n,]+)/i
      ],
      
      // Email patterns
      email: [
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
      ],
      
      // Phone patterns
      phone: [
        /(?:Phone|Tel|Mobile|Contact)[\s:]+([\+\(]?[0-9\-\(\)\s]+)/i,
        /(\+?[\d\s\-\(\)]{10,})/i
      ],
      
      // Address patterns
      address: [
        /(?:Address|Location)[\s:]+([^,\n]+(?:, [^,\n]+)?)/i,
        /(\d+ [A-Za-z0-9\s,]+(?:Avenue|Street|St|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd))/i
      ],
      
      // City patterns
      city: [
        /(?:City)[\s:]+([A-Za-z\s]+)/i,
        /(?:,\s*)([A-Za-z\s]+)(?:,\s*[A-Z]{2})/i,
        /([A-Za-z\s]+)(?:,\s*[A-Z]{2}\s+\d{5})/i
      ],
      
      // State patterns
      state: [
        /(?:State|Province)[\s:]+([A-Z]{2})/i,
        /(?:,\s*)([A-Z]{2})(?:\s+\d{5})/i
      ],
      
      // Zip code patterns
      zipCode: [
        /(?:Zip|Postal)[\s:]+(\d{5}(?:-\d{4})?)/i,
        /\b(\d{5}(?:-\d{4})?)\b/
      ],
      
      // Project value patterns
      projectValue: [
        /(?:Project Value|Budget|Amount|Cost)[\s:$]+([\d,]+\.?\d*)/i,
        /\$([\d,]+\.?\d*)/i,
        /(?:USD|EUR|GBP)\s*([\d,]+\.?\d*)/i
      ]
    };

    // Extract data using patterns
    for (const [field, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = text.match(pattern);
        if (match) {
          let value = match[1] || match[0];
          // Clean up the value
          value = value.trim();
          
          // Remove trailing commas, colons, etc.
          value = value.replace(/[,:;]+$/, '');
          
          // Handle special cases
          if (field === 'phone' && value) {
            value = value.replace(/\s+/g, ' ').trim();
          }
          
          if (field === 'email' && value) {
            value = value.toLowerCase().trim();
          }
          
          data[field] = value;
          break;
        }
      }
    }

    // Additional intelligent extraction for address components
    this.extractAddressComponents(text, data);
    
    // Try to extract project value from text more intelligently
    if (!data.projectValue) {
      const valueMatch = text.match(/(?:total|project|budget|amount|value)[\s:]*[$]?\s*([0-9,]+\.?[0-9]*)/i);
      if (valueMatch) {
        data.projectValue = valueMatch[1].replace(/,/g, '');
      }
    }

    return data;
  }

  /**
   * Extract address components from text
   */
  extractAddressComponents(text, data) {
    // If we have an address but no city/state/zip, try to parse it
    if (data.address && (!data.city || !data.state || !data.zipCode)) {
      const addressParts = data.address.split(',').map(part => part.trim());
      
      if (addressParts.length >= 2) {
        const lastPart = addressParts[addressParts.length - 1].trim();
        const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
        
        if (stateZipMatch) {
          data.state = stateZipMatch[1];
          data.zipCode = stateZipMatch[2];
          data.city = addressParts[addressParts.length - 2] || '';
        }
      }
    }
  }

  /**
   * Main method to process PDF and extract lead data
   */
  async processPDF(file) {
    try {
      // Extract text from PDF
      const text = await this.extractTextFromPDF(file);
      
      // Extract structured data
      const extractedData = this.extractLeadData(text);
      
      // Add the raw text as notes if no notes were found
      if (!extractedData.notes) {
        extractedData.notes = `Extracted from PDF: ${file.name}\n\n${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`;
      }
      
      return extractedData;
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error('Failed to process PDF file');
    }
  }
}

export default new PDFParserService();