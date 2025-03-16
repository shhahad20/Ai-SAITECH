import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { DOCUMENT_SECTIONS } from '../lib/constants';
import { getEmbedding } from '../lib/openai'; 
import { cosineSimilarity } from '../lib/cosineSimilarity';

interface FAQ {
  question: string;
  answer: string;
  section: string;
}

// Sample FAQs – in a real application, these would come from your database.
const FAQS: FAQ[] = [
  {
    question: "What are the key components of FMS policies?",
    answer: "FMS policies typically include standard operating procedures, emergency protocols, maintenance schedules, and compliance requirements. These policies ensure consistent facility management practices across the organization.",
    section: DOCUMENT_SECTIONS.FMS_POLICIES.id
  },
  {
    question: "How often should safety equipment be inspected?",
    answer: "Safety equipment should be inspected monthly, with comprehensive reviews quarterly. Emergency equipment like fire extinguishers and first aid kits require monthly documented checks.",
    section: DOCUMENT_SECTIONS.SAFETY.id
  },
  {
    question: "What is the standard maintenance schedule for HVAC systems?",
    answer: "HVAC systems require quarterly preventive maintenance, with filter changes every 3 months and full system inspections bi-annually. Emergency maintenance should be conducted as needed.",
    section: DOCUMENT_SECTIONS.MAINTENANCE.id
  },
  {
    question: "What documentation is required for commissioning?",
    answer: "Commissioning requires detailed documentation including system specifications, test procedures, performance data, and verification reports. All documentation must be maintained for compliance purposes.",
    section: DOCUMENT_SECTIONS.COMMISSIONING.id
  },
  {
    question: "How are industry standards implemented in daily operations?",
    answer: "Industry standards are implemented through documented procedures, regular training, compliance monitoring, and periodic audits. Updates to standards must be communicated and integrated into existing processes.",
    section: DOCUMENT_SECTIONS.STANDARDS.id
  }
];

export const FAQTab: React.FC = () => {
  // Local states for search, filtering, expanded FAQs, etc.
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQs, setExpandedFAQs] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string | 'all'>('all');
  
  // We'll store the precomputed embeddings for each FAQ here.
  const [faqEmbeddings, setFaqEmbeddings] = useState<number[][]>([]);
  // And we store the FAQs to display after filtering.
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>(FAQS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 3a: Precompute FAQ embeddings on component mount.
  useEffect(() => {
    async function computeFaqEmbeddings() {
      try {
        const embeddings = await Promise.all(
          FAQS.map(faq => getEmbedding(`${faq.question} ${faq.answer}`))
        );
        setFaqEmbeddings(embeddings);
      } catch (err) {
        setError("Failed to compute FAQ embeddings.");
        console.error(err);
      }
    }
    computeFaqEmbeddings();
  }, []);

  // Step 3b: Whenever searchTerm, activeSection, or faqEmbeddings changes, perform the semantic search.
  useEffect(() => {
    async function performSearch() {
      // First, filter by section (if not "all")
      let candidateFaqs = FAQS;
      let candidateEmbeddings = faqEmbeddings;
      if (activeSection !== 'all') {
        const filtered = FAQS.map((faq, index) => ({ faq, index }))
          .filter(({ faq }) => faq.section === activeSection);
        candidateFaqs = filtered.map(item => item.faq);
        candidateEmbeddings = filtered.map(item => faqEmbeddings[item.index]);
      }

      // If no search term, simply display the candidate FAQs.
      if (!searchTerm.trim()) {
        setFilteredFaqs(candidateFaqs);
        return;
      }

      setLoading(true);
      try {
        // Compute the embedding for the query
        const queryEmbedding = await getEmbedding(searchTerm);
        // Compute similarity between the query and each candidate FAQ
        const similarities = candidateEmbeddings.map(embedding =>
          cosineSimilarity(embedding, queryEmbedding)
        );
        // Set a threshold – adjust this as needed for your use case.
        const threshold = 0.5;
        const results = candidateFaqs.filter((_, idx) => similarities[idx] >= threshold);
        setFilteredFaqs(results);
      } catch (err) {
        setError("An error occurred during search.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    // Only perform search if embeddings are ready.
    if (faqEmbeddings.length > 0) {
      performSearch();
    }
  }, [searchTerm, activeSection, faqEmbeddings]);

  // Toggle FAQ expansion (open/close answer)
  const toggleFAQ = (question: string) => {
    const newExpanded = new Set(expandedFAQs);
    if (newExpanded.has(question)) {
      newExpanded.delete(question);
    } else {
      newExpanded.add(question);
    }
    setExpandedFAQs(newExpanded);
  };

  // Prepare section filter buttons.
  const sections = [
    { id: 'all', name: 'All Sections' },
    ...Object.values(DOCUMENT_SECTIONS)
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="mt-2 text-gray-600">
          Find answers to common questions across all governance sections.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                activeSection === section.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading FAQs...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">{error}</div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No FAQs found matching your search criteria.
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <div
              key={faq.question}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white"
            >
              <button
                onClick={() => toggleFAQ(faq.question)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                {expandedFAQs.has(faq.question) ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
              
              {expandedFAQs.has(faq.question) && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-gray-700 whitespace-pre-line">{faq.answer}</p>
                  <div className="mt-2 flex items-center">
                    <span className="text-sm text-gray-500">
                      Section: {Object.values(DOCUMENT_SECTIONS).find(s => s.id === faq.section)?.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FAQTab;
