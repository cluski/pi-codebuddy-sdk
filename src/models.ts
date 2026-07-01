// Dynamic model list from CodeBuddy SDK supportedModels().

import type { ModelInfo } from "@tencent-ai/agent-sdk";

export type PiModel = {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	contextWindow: number;
	maxTokens: number;
	thinkingLevelMap?: Record<string, string>;
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
};

const DEFAULT_CONTEXT = 262_144;
const DEFAULT_MAX_TOKENS = 12_288;

function detectThinking(id: string): boolean {
	return /claude|gemini|gpt-5|hy3|deepseek|glm/i.test(id);
}

function detectImages(id: string): boolean {
	return /claude|gemini|gpt/i.test(id);
}

function estimateContext(id: string): number {
	const lower = id.toLowerCase();
	if (lower.includes("gemini")) return 1_048_576;
	if (lower.includes("claude") || lower.includes("gpt")) return 200_000;
	return DEFAULT_CONTEXT;
}

function estimateMaxTokens(id: string): number {
	if (id.toLowerCase().includes("gpt")) return 16_384;
	return DEFAULT_MAX_TOKENS;
}

export function rawModelsFromSdk(supported: Array<ModelInfo & { id?: string; name?: string }>): PiModel[] {
	return supported
		.map((m) => ({ id: m.id ?? m.value, name: m.name ?? m.displayName ?? m.id ?? m.value }))
		.filter((m) => m.id)
		.map((m) => ({
		id: m.id!,
		name: m.name || m.id!,
		reasoning: detectThinking(m.id!),
		input: detectImages(m.id!) ? ["text", "image"] as const : ["text"] as const,
		contextWindow: estimateContext(m.id!),
		maxTokens: estimateMaxTokens(m.id!),
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	}));
}

export const FALLBACK_MODELS: PiModel[] = [
	{ id: "hy3-preview-agent-ioa", name: "Hunyuan 3 Preview", reasoning: true, input: ["text"], contextWindow: DEFAULT_CONTEXT, maxTokens: DEFAULT_MAX_TOKENS, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } },
];

export type ModelOverrides = Record<string, { contextWindow?: number; maxTokens?: number }>;

/** Apply per-model contextWindow / maxTokens overrides from config. Key matching is case-insensitive. */
export function applyOverrides(models: PiModel[], overrides?: ModelOverrides): PiModel[] {
	if (!overrides || Object.keys(overrides).length === 0) return models;
	return models.map((m) => {
		const lower = m.id.toLowerCase();
		const override = Object.entries(overrides).find(([key]) => key.toLowerCase() === lower)?.[1];
		if (!override) return m;
		return {
			...m,
			...(override.contextWindow != null ? { contextWindow: override.contextWindow } : {}),
			...(override.maxTokens != null ? { maxTokens: override.maxTokens } : {}),
		};
	});
}

export function buildModels(models: PiModel[], overrides?: ModelOverrides): PiModel[] {
	return applyOverrides(models, overrides).map((m) => ({
		...m,
		cost: m.cost ?? { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	}));
}

export function codebuddyModelId(model: { id: string }): string {
	return model.id;
}

export function resolveModel<T extends { id: string }>(models: T[], input: string): T | undefined {
	const lower = input.toLowerCase();
	return models.find((m) => m.id === lower || m.id.toLowerCase().includes(lower));
}
