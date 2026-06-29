import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { invokeWithRetry } from "@/lib/agent/nodes";

// Follow-up Q&A grounded in the already-gathered research context.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, question, context } = body as {
      companyName?: string;
      question?: string;
      context?: string;
    };

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "A question is required." }, { status: 400 });
    }

    const answer = await invokeWithRetry(
      [
        new SystemMessage(
          `You are an investment research analyst assistant for the company "${companyName ?? "the company"}".
        Answer the user's question concisely and factually, grounded in the research context provided below.
        If the context does not contain the answer, say so and give your best general analysis without inventing
        specific figures. Use short paragraphs or bullet points. Do not give personalized financial advice.

        --- RESEARCH CONTEXT ---
        ${(context ?? "").slice(0, 12000)}`
        ),
        new HumanMessage(question),
      ],
      { label: "chat" }
    );

    return NextResponse.json({ success: true, answer });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Chat failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
