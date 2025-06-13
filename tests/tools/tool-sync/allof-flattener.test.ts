/**
 * Tests for flattenAllOfSchema and property conflict handling.
 * No secrets. Modular, <500 lines.
 */
import { flattenAllOfSchema } from '../../../src/tools/tool-sync/allof-flattener';

describe('flattenAllOfSchema', () => {
	it('flattens allOf with multiple schemas', () => {
		const schema = {
			allOf: [
				{
					type: 'object',
					properties: { a: { type: 'string' } },
					required: ['a'],
				},
				{
					type: 'object',
					properties: { b: { type: 'number' } },
					required: ['b'],
				},
			],
		};
		const flat = flattenAllOfSchema(schema);
		expect(flat.properties).toEqual({
			a: { type: 'string' },
			b: { type: 'number' },
		});
		expect(flat.required.sort()).toEqual(['a', 'b']);
	});

	it('flattens nested allOf', () => {
		const schema = {
			allOf: [
				{
					allOf: [
						{
							type: 'object',
							properties: { x: { type: 'boolean' } },
							required: ['x'],
						},
						{
							type: 'object',
							properties: { y: { type: 'string' } },
						},
					],
				},
				{
					type: 'object',
					properties: { z: { type: 'integer' } },
					required: ['z'],
				},
			],
		};
		const flat = flattenAllOfSchema(schema);
		expect(flat.properties).toEqual({
			x: { type: 'boolean' },
			y: { type: 'string' },
			z: { type: 'integer' },
		});
		expect(flat.required.sort()).toEqual(['x', 'z']);
	});

	it('handles property conflicts (last wins, type safety)', () => {
		const schema = {
			allOf: [
				{
					type: 'object',
					properties: { foo: { type: 'string', description: 'first' } },
				},
				{
					type: 'object',
					properties: { foo: { type: 'number', description: 'second' } },
				},
			],
		};
		const flat = flattenAllOfSchema(schema);
		expect(flat.properties).toEqual({
			foo: { type: 'number', description: 'second' },
		});
	});

	it('recursively flattens properties with nested allOf', () => {
		const schema = {
			type: 'object',
			properties: {
				nested: {
					allOf: [
						{
							properties: { a: { type: 'string' } },
						},
						{
							properties: { b: { type: 'boolean' } },
						},
					],
				},
			},
		};
		const flat = flattenAllOfSchema(schema);
		expect(flat.properties.nested.properties).toEqual({
			a: { type: 'string' },
			b: { type: 'boolean' },
		});
	});

	it('returns empty object for invalid input', () => {
		expect(flattenAllOfSchema(null)).toEqual({});
		expect(flattenAllOfSchema(undefined)).toEqual({});
		expect(flattenAllOfSchema(42 as any)).toEqual({});
	});
});