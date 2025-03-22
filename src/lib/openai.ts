import OpenAI from "openai";
import { supabase } from "./supabase";
import { isSupabaseConfigured } from "./supabase";
// import { DEFAULT_SECTION } from "./constants";

const openai_key = import.meta.env.VITE_OPENAI_API_KEY;
const openaiClient = new OpenAI({
  apiKey: openai_key,
  dangerouslyAllowBrowser: true,
});

export async function getAIResponse(
  question: string,
  documentId?: string,
  sectionId?: string,
  isFollowUp: boolean = false
): Promise<{
  bestAnswer: string;
  alternativeAnswer?: string;
  source: string;
  documentId: string;
} | null> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.'
    );
  }
  // const { data: sectionData } = await supabase
  //   .from("sub_sections")
  //   .select("id")
  //   .eq("id", sectionId)
  //   .single();

  // if (!sectionData) {
  //   throw new Error("Section not found");
  // }
  // sectionId = sectionData.id;
  // console.log(sectionId)
  try {
    if (!question.trim()) {
      throw new Error("No question provided");
    }

    // Validate sectionId as UUID format
    if (
      sectionId &&
      !/^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/.test(
        sectionId
      )
    ) {
      throw new Error("Invalid section ID format");
    }

    let targetDocument;

    if (isFollowUp && documentId) {
      // For follow-up questions, use the specified document
      const { data: document, error } = await supabase
        .from("documents")
        .select("content, name, id")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      if (!document) {
        throw new Error("Document not found");
      }

      targetDocument = document;
    } else {
      // For new questions, search across documents in the specified section
      // Handle new question with section filter
      const query = supabase
        .from("documents")
        .select("id, content, name, section_id");

      if (sectionId) {
        query.eq("section_id", sectionId);
      }

      const { data: documents, error } = await query;

      if (error) throw error;
      if (!documents?.length) return null;

      // Create a prompt to find relevant documents
      const completion = await openaiClient.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are analyzing documents to find relevant information for a question.
            Return a JSON array of document IDs sorted by relevance, with scores and reasons.
            Format: { "rankings": [{ "id": "doc_id", "score": 0.95, "reason": "explanation" }] }`,
          },
          {
            role: "user",
            content: `Question: ${question}\n\nDocuments:\n${documents
              .map(
                (doc) =>
                  `ID: ${doc.id}\nName: ${
                    doc.name
                  }\nContent Preview: ${doc.content.substring(0, 500)}...\n---`
              )
              .join("\n")}`,
          },
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const rankings = JSON.parse(
        completion.choices[0]?.message?.content || "{}"
      ).rankings;
      if (!rankings || rankings.length === 0) return null;

      targetDocument = documents.find((doc) => doc.id === rankings[0].id);
      if (!targetDocument) return null;
    }

    const completion = await openaiClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are answering questions about documents. Structure your response in the following format:

[Summary]
• If the answer describes a process or steps, list each step as a bullet point
• If not a process, provide a clear, direct explanation in 1-2 sentences

[Reference]
• The exact, relevant quote from the document that supports the summary

[Context] (Optional)
• Additional relevant information
• Alternative interpretations
• Related points

If no relevant answer exists, respond ONLY with: "The answer is not available in the current document."

${
  isFollowUp
    ? "This is a follow-up question. Consider previous context."
    : "This is a new question."
}`,
        },
        {
          role: "user",
          content: `Document content: ${targetDocument.content}\n\nQuestion: ${question}`,
        },
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response received from OpenAI");
    }

    // Handle no answer found
    if (response.includes("not available in the current document")) {
      return isFollowUp
        ? {
            bestAnswer:
              "The answer is not available in the current document. If you want to search across all documents, please start a new chat.",
            source: targetDocument.name,
            documentId: targetDocument.id,
          }
        : null;
    }

    // Parse sections
    const sections = {
      summary: (response.match(/\[Summary\](.*?)(?=\[|$)/s) || [])[1]?.trim(),
      reference: (response.match(/\[Reference\](.*?)(?=\[|$)/s) ||
        [])[1]?.trim(),
      context: (response.match(/\[Context\](.*?)(?=\[|$)/s) || [])[1]?.trim(),
    };

    return {
      bestAnswer: sections.summary || "No summary available",
      alternativeAnswer: sections.reference || undefined,
      source: targetDocument.name,
      documentId: targetDocument.id,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error instanceof Error
      ? error
      : new Error("Error processing your request. Please try again.");
  }
}

export async function analyzeDocument(content: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Please connect to Supabase first using the "Connect to Supabase" button in the top right corner.'
    );
  }

  try {
    if (!content.trim()) {
      throw new Error("No content provided for analysis");
    }

    const completion = await openaiClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Provide a brief, focused summary of the main points in 2-3 sentences.",
        },
        { role: "user", content },
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 200,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response received from OpenAI");
    }

    return response;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error instanceof Error
      ? error
      : new Error("Error analyzing the document. Please try again.");
  }
}

// embedding function
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`, // Ensure your key is secure!
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-ada-002", // Best for generating embeddings for semantic search; cost-effective but usage-based (not free).
    }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}
