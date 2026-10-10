package com.imagemetadata.model;

import lombok.Getter;

import java.util.*;

@Getter
public enum AdobeStockCategory {
    ANIMALS(1, "Animals"),
    BUILDINGS_AND_ARCHITECTURE(2, "Buildings and Architecture"),
    BUSINESS(3, "Business"),
    DRINKS(4, "Drinks"),
    THE_ENVIRONMENT(5, "The Environment"),
    STATES_OF_MIND(6, "States of Mind"),
    FOOD(7, "Food"),
    GRAPHIC_RESOURCES(8, "Graphic Resources"),
    HOBBIES_AND_LEISURE(9, "Hobbies and Leisure"),
    INDUSTRY(10, "Industry"),
    LANDSCAPES(11, "Landscapes"),
    LIFESTYLE(12, "Lifestyle"),
    PEOPLE(13, "People"),
    PLANTS_AND_FLOWERS(14, "Plants and Flowers"),
    CULTURE_AND_RELIGION(15, "Culture and Religion"),
    SCIENCE(16, "Science"),
    SOCIAL_ISSUES(17, "Social Issues"),
    SPORTS(18, "Sports"),
    TECHNOLOGY(19, "Technology"),
    TRANSPORT(20, "Transport"),
    TRAVEL(21, "Travel");

    private final int id;
    private final String name;

    AdobeStockCategory(int id, String name) {
        this.id = id;
        this.name = name;
    }

    private static final Map<Integer, AdobeStockCategory> BY_ID = new HashMap<>();
    private static final Map<String, AdobeStockCategory> BY_NAME = new HashMap<>();

    static {
        for (AdobeStockCategory cat : values()) {
            BY_ID.put(cat.id, cat);
            BY_NAME.put(cat.name.toLowerCase(Locale.ROOT), cat);
            BY_NAME.put(cat.name().toLowerCase(Locale.ROOT).replace('_', ' '), cat);
        }
    }

    public static AdobeStockCategory fromId(Integer id) {
        if (id == null) return null;
        return BY_ID.get(id);
    }

    public static AdobeStockCategory fromName(String name) {
        if (name == null || name.trim().isEmpty()) return null;
        return BY_NAME.get(name.trim().toLowerCase(Locale.ROOT));
    }

    /**
     * Intelligently infers the most suitable Adobe Stock category based on
     * subjects, environment, title, and keywords.
     */
    public static AdobeStockCategory inferCategory(String title, String environment, List<String> subjects, List<String> keywords) {
        String corpus = String.join(" ",
                title != null ? title.toLowerCase(Locale.ROOT) : "",
                environment != null ? environment.toLowerCase(Locale.ROOT) : "",
                subjects != null ? String.join(" ", subjects).toLowerCase(Locale.ROOT) : "",
                keywords != null ? String.join(" ", keywords).toLowerCase(Locale.ROOT) : ""
        );

        if (matches(corpus, "dog", "cat", "bird", "wildlife", "animal", "pet", "fish", "lion", "tiger", "bear", "elephant", "safari")) {
            return ANIMALS;
        }
        if (matches(corpus, "drink", "cocktail", "coffee", "tea", "beer", "wine", "beverage", "juice", "whiskey", "bar")) {
            return DRINKS;
        }
        if (matches(corpus, "food", "burger", "pizza", "meal", "fruit", "vegetable", "dessert", "cake", "cooking", "restaurant", "bread", "dinner", "lunch")) {
            return FOOD;
        }
        if (matches(corpus, "flower", "flowers", "plant", "garden", "blossom", "botany", "leaf", "flora", "rose", "tree blossom")) {
            return PLANTS_AND_FLOWERS;
        }
        if (matches(corpus, "building", "architecture", "skyscraper", "skyline", "facade", "house", "exterior", "interior design", "urban architecture")) {
            return BUILDINGS_AND_ARCHITECTURE;
        }
        if (matches(corpus, "car", "automobile", "airplane", "flight", "train", "vehicle", "traffic", "ship", "boat", "subway", "highway", "truck")) {
            return TRANSPORT;
        }
        if (matches(corpus, "technology", "computer", "cyber", "robot", "artificial intelligence", "coding", "software", "circuit", "digital", "neon futuristic", "futuristic", "tech")) {
            return TECHNOLOGY;
        }
        if (matches(corpus, "sports", "football", "soccer", "basketball", "athlete", "fitness", "workout", "gym", "marathon", "running", "tennis")) {
            return SPORTS;
        }
        if (matches(corpus, "science", "laboratory", "microscope", "chemistry", "physics", "dna", "medical", "doctor", "medicine", "pharmaceutical", "hospital")) {
            return SCIENCE;
        }
        if (matches(corpus, "business", "meeting", "office", "executive", "corporate", "finance", "investment", "colleagues", "handshake", "consulting")) {
            return BUSINESS;
        }
        if (matches(corpus, "portrait", "person", "man", "woman", "children", "people", "face", "smile", "family", "worker")) {
            return PEOPLE;
        }
        if (matches(corpus, "travel", "vacation", "tourism", "destination", "resort", "hotel", "beach", "passport", "sightseeing")) {
            return TRAVEL;
        }
        if (matches(corpus, "mountain", "lake", "ocean", "landscape", "sunset", "sunrise", "nature", "scenery", "scenic", "river", "valley", "forest", "hills")) {
            return LANDSCAPES;
        }
        if (matches(corpus, "factory", "industrial", "warehouse", "construction", "manufacturing", "crane", "engineer")) {
            return INDUSTRY;
        }
        if (matches(corpus, "environment", "ecology", "green energy", "wind turbine", "solar panel", "recycling", "pollution", "climate")) {
            return THE_ENVIRONMENT;
        }
        if (matches(corpus, "abstract", "background", "texture", "pattern", "3d render", "vector", "illustration", "wallpaper", "graphic")) {
            return GRAPHIC_RESOURCES;
        }
        if (matches(corpus, "lifestyle", "hobby", "leisure", "relax", "yoga", "meditation", "reading", "home")) {
            return LIFESTYLE;
        }

        // Default to Landscapes or Graphic Resources if broad
        return LANDSCAPES;
    }

    private static boolean matches(String text, String... words) {
        for (String w : words) {
            if (text.contains(w)) return true;
        }
        return false;
    }
}
