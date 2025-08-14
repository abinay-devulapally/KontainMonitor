'use server';

/**
 * @fileOverview An AI agent that analyzes container and pod configurations and suggests improvements for resource allocation.
 *
 * - suggestResourceImprovements - A function that handles the resource improvement suggestion process.
 * - SuggestResourceImprovementsInput - The input type for the suggestResourceImprovements function.
 * - SuggestResourceImprovementsOutput - The return type for the suggestResourceImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestResourceImprovementsInputSchema = z.object({
  containerConfiguration: z
    .string()
    .describe('The configuration details of the container.'),
  podConfiguration: z
    .string()
    .describe('The configuration details of the pod.'),
  resourceUsageData: z
    .string()
    .describe(
      'Historical resource usage data for the container and pod (CPU, memory, network).' /* JSON string? CSV?  Need to decide */
    ),
});
export type SuggestResourceImprovementsInput = z.infer<
  typeof SuggestResourceImprovementsInputSchema
>;

const SuggestResourceImprovementsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe(
      'A list of suggestions for improving resource allocation (CPU, memory) for the container and pod.'
    ),
  rationale: z
    .string()
    .describe(
      'The rationale behind the suggestions, explaining why the suggested changes are recommended.'
    ),
});
export type SuggestResourceImprovementsOutput = z.infer<
  typeof SuggestResourceImprovementsOutputSchema
>;

export async function suggestResourceImprovements(
  input: SuggestResourceImprovementsInput
): Promise<SuggestResourceImprovementsOutput> {
  return suggestResourceImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestResourceImprovementsPrompt',
  input: {schema: SuggestResourceImprovementsInputSchema},
  output: {schema: SuggestResourceImprovementsOutputSchema},
  prompt: `You are an expert DevOps engineer specializing in optimizing container and pod resource allocation.

You will analyze the provided container and pod configurations, along with their historical resource usage data, and suggest improvements for CPU and memory allocation.
Explain the rationale behind each suggestion.

Container Configuration:
{{{containerConfiguration}}}

Pod Configuration:
{{{podConfiguration}}}

Resource Usage Data:
{{{resourceUsageData}}}

Suggestions:
`, // Prompt is incomplete, consider adding example outputs.
});

const suggestResourceImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestResourceImprovementsFlow',
    inputSchema: SuggestResourceImprovementsInputSchema,
    outputSchema: SuggestResourceImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
