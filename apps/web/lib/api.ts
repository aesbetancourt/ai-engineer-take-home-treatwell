import 'server-only';
import { NextResponse } from 'next/server';

// These variables have no NEXT_PUBLIC prefix, so Next keeps them out of the browser bundle.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const API_KEY = process.env.API_KEY;

type ProxyOptions = { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown };

/** Sends one request to the API from the server. Returns the JSON body of the API, always with the status 200. */
export async function proxyToApi(path: string, { method = 'GET', body }: ProxyOptions = {}) {
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
  return NextResponse.json(await res.json());
}
