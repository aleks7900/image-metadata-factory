package com.imagemetadata.exception;

public class LlmProviderException extends RuntimeException {
    private final boolean retryable;

    public LlmProviderException(String message, boolean retryable) {
        super(message);
        this.retryable = retryable;
    }

    public LlmProviderException(String message, Throwable cause, boolean retryable) {
        super(message, cause);
        this.retryable = retryable;
    }

    public boolean isRetryable() {
        return retryable;
    }
}
