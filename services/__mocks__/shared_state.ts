export const mockStorage = new Map<string, string>();
export let mockInvokeResponse: any = { data: null, error: null };
export let mockInvokeResponses: any[] = [];
export let invokeCount = 0;

export function resetMocks() {
    mockStorage.clear();
    mockInvokeResponse = { data: null, error: null };
    mockInvokeResponses = [];
    invokeCount = 0;
}

export function setMockInvokeResponse(response: any) {
    mockInvokeResponse = response;
}

export function setMockInvokeResponses(responses: any[]) {
    mockInvokeResponses = responses;
}

export function incrementInvokeCount() {
    invokeCount++;
}
