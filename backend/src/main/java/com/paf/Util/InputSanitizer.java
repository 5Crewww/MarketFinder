package com.paf.Util;

import java.text.Normalizer;
import java.util.regex.Pattern;

public final class InputSanitizer {

    private static final Pattern HTML_TAGS = Pattern.compile("<[^>]*>");
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}&&[^\r\n\t]]");
    private static final Pattern MULTIPLE_SPACES = Pattern.compile("\\s+");

    private InputSanitizer() {
    }

    public static String sanitizeText(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String sanitized = HTML_TAGS.matcher(value).replaceAll(" ");
        sanitized = CONTROL_CHARS.matcher(sanitized).replaceAll("");
        sanitized = sanitized.replace("<", "").replace(">", "").replace("\"", "").replace("'", "");
        sanitized = MULTIPLE_SPACES.matcher(sanitized.trim()).replaceAll(" ");

        if (sanitized.isBlank()) {
            return null;
        }

        if (sanitized.length() > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    public static String sanitizeEmail(String value) {
        String sanitized = sanitizeText(value, 180);
        return sanitized == null ? null : sanitized.toLowerCase();
    }

    public static String sanitizeLayoutImage(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String sanitized = value.trim();
        if (sanitized.startsWith("data:image/") || sanitized.startsWith("http://") || sanitized.startsWith("https://")) {
            return sanitized;
        }
        throw new IllegalArgumentException("Formato de mapa inválido.");
    }

    public static String normalizeSearch(String value) {
        String sanitized = sanitizeText(value, 180);
        if (sanitized == null) {
            return null;
        }
        String normalized = Normalizer.normalize(sanitized.toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return MULTIPLE_SPACES.matcher(normalized).replaceAll(" ");
    }
}
