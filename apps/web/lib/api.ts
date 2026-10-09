import 'server-only';
import { NextResponse } from 'next/server';
import { errorCodes, type ErrorBody, type ErrorCode } from '@venue/contract';

// These variables have no NEXT_PUBLIC prefix, so Next keeps them out of the browser bundle.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const API_KEY = process.env.API_KEY;

/** The part of a contract schema that this file uses. */
type Schema<T> = {
  safeParse(input: unknown): { success: true; data: T } | { success: false; error: { issues: unknown[] } };
};

type RequestOptions = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown };

/** Sends one request to the API from the server. Returns the status code and the JSON body of the API. */
export async function requestApi(path: string, { method = 'GET', body }: RequestOptions = {}) {
  const headers: Record<string, string> = {};
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  const res = await fetch(API_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: unknown = await res.json();
  return { status: res.status, body: json };
}

/** Sends one request to the API from the server. Returns the JSON body of the API, always with the status 200. */
export async function proxyToApi(path: string, options: RequestOptions = {}) {
  const { body } = await requestApi(path, options);
  return NextResponse.json(body);
}

type ErrorResponseOptions = { status: number; code: ErrorCode; message: string; details?: unknown };

/** Makes an error response with the error body of the contract. */
export function errorResponse({ status, code, message, details }: ErrorResponseOptions) {
  const body: ErrorBody = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

/** Sends one request to the API from the server. Forwards the status code and the JSON body of the API. */
export async function forwardToApi(path: string, options: RequestOptions = {}) {
  try {
    const { status, body } = await requestApi(path, options);
    return NextResponse.json(body, { status });
  } catch {
    // The API did not answer, or its answer was not JSON.
    return errorResponse({ status: 502, code: errorCodes.INTERNAL_ERROR, message: 'The API is not available' });
  }
}

/** Parses the JSON body of a request with a contract schema. Returns the 400 response when the body is not valid. */
export async function parseBody<T>(req: Request, schema: Schema<T>): Promise<{ data: T } | { response: NextResponse }> {
  const json: unknown = await req.json().catch(() => undefined);
  const result = schema.safeParse(json);
  if (!result.success) {
    const details = result.error.issues;
    return { response: errorResponse({ status: 400, code: errorCodes.VALIDATION_ERROR, message: 'Invalid input', details }) };
  }
  return { data: result.data };
}
