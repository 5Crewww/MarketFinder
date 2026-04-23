package com.paf.Config;

/**
 * Excepção lançada quando um utilizador excede o limite de tentativas de login.
 * Mapeada para HTTP 429 Too Many Requests pelo GlobalExceptionHandler.
 */
public class TooManyRequestsException extends RuntimeException {

    public TooManyRequestsException(String message) {
        super(message);
    }
}
