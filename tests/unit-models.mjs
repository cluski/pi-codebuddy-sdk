/**
 * Tests for CodeBuddy model helpers.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyOverrides, buildModels, codebuddyModelId, rawModelsFromSdk, resolveModel, FALLBACK_MODELS } from "../src/models.js";

describe("rawModelsFromSdk", () => {
	it("maps SDK ModelInfo to pi models", () => {
		const models = rawModelsFromSdk([
			{ value: "hy3-preview-agent-ioa", displayName: "Hunyuan 3", description: "" },
			{ id: "claude-sonnet-4.6", name: "Claude Sonnet", description: "" },
		]);
		assert.equal(models[0].id, "hy3-preview-agent-ioa");
		assert.equal(models[1].input.includes("image"), true);
		assert.deepEqual(models[0].cost, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
	});
});

describe("buildModels", () => {
	it("preserves order from SDK", () => {
		const models = buildModels(rawModelsFromSdk([
			{ value: "model-b", displayName: "B", description: "" },
			{ value: "model-a", displayName: "A", description: "" },
		]));
		assert.deepEqual(models.map((m) => m.id), ["model-b", "model-a"]);
	});
});

describe("codebuddyModelId", () => {
	it("returns model id unchanged", () => {
		assert.equal(codebuddyModelId({ id: "hy3-preview-agent-ioa" }), "hy3-preview-agent-ioa");
	});
});

describe("applyOverrides", () => {
	const models = rawModelsFromSdk([
		{ value: "model-a", displayName: "A", description: "" },
		{ value: "model-b", displayName: "B", description: "" },
	]);

	it("returns unchanged with no overrides", () => {
		const result = applyOverrides(models, undefined);
		assert.deepStrictEqual(result.map(m => ({ id: m.id, contextWindow: m.contextWindow })), [
			{ id: "model-a", contextWindow: 262144 },
			{ id: "model-b", contextWindow: 262144 },
		]);
	});

	it("applies contextWindow override (case-insensitive)", () => {
		const result = applyOverrides(models, { "MODEL-a": { contextWindow: 256_000 } });
		assert.equal(result[0].contextWindow, 256_000);
		assert.equal(result[1].contextWindow, 262144); // unchanged
	});

	it("applies maxTokens override", () => {
		const result = applyOverrides(models, { "model-b": { maxTokens: 16_384 } });
		assert.equal(result[0].maxTokens, 12288); // unchanged
		assert.equal(result[1].maxTokens, 16_384);
	});

	it("applies both contextWindow and maxTokens", () => {
		const result = applyOverrides(models, { "model-a": { contextWindow: 512_000, maxTokens: 32_768 } });
		assert.equal(result[0].contextWindow, 512_000);
		assert.equal(result[0].maxTokens, 32_768);
	});

	it("applies partial override (only contextWindow)", () => {
		const result = applyOverrides(models, { "model-a": { contextWindow: 128_000 } });
		assert.equal(result[0].contextWindow, 128_000);
		assert.equal(result[0].maxTokens, 12288); // unchanged
	});

	it("empty overrides object returns unchanged", () => {
		const result = applyOverrides(models, {});
		assert.deepStrictEqual(result, models);
	});
});
describe("resolveModel", () => {
	const models = buildModels(FALLBACK_MODELS);

	it("resolves by partial id", () => {
		assert.equal(resolveModel(models, "hy3")?.id, "hy3-preview-agent-ioa");
	});

	it("returns undefined when no match", () => {
		assert.equal(resolveModel(models, "gpt-9"), undefined);
	});
});
