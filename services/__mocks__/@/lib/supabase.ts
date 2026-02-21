import { incrementInvokeCount, invokeCount, mockInvokeResponse, mockInvokeResponses } from "../../shared_state.ts";

export const supabase = {
    functions: {
        invoke: async (name: string, options: any) => {
            const currentCount = invokeCount;
            incrementInvokeCount();

            if (mockInvokeResponses.length > 0) {
                return Promise.resolve(mockInvokeResponses[currentCount] || mockInvokeResponses[mockInvokeResponses.length - 1]);
            }
            return Promise.resolve(mockInvokeResponse);
        },
    },
};
