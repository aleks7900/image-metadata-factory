package com.imagemetadata.model;

import lombok.Getter;

import java.util.*;

@Getter
public enum AdobeStockCategory {
    ANIMALS(1, "Animals", "Animals, wildlife, pets, insects, zoology"),
    BUILDINGS_AND_ARCHITECTURE(2, "Buildings and Architecture", "Architecture, structures, urban skylines, interiors, exteriors, landmarks"),
    BUSINESS(3, "Business", "Business, corporate offices, finance, economics, corporate teamwork, professional workplaces"),
    DRINKS(4, "Drinks", "Beverages, alcohol, coffee, tea, cocktails, wine, beer, soft drinks"),
    THE_ENVIRONMENT(5, "The Environment", "Ecology, green energy, conservation, climate, recycling, renewable nature preservation"),
    STATES_OF_MIND(6, "States of Mind", "Emotions, mental health, feelings, spiritual expressions, psychological states"),
    FOOD(7, "Food", "Culinary, meals, ingredients, cooking, dishes, dining, produce, fruit, vegetables"),
    GRAPHIC_RESOURCES(8, "Graphic Resources", "Abstract textures, patterns, backgrounds, 3D renders, vector graphics, wallpapers, graphic design elements"),
    HOBBIES_AND_LEISURE(9, "Hobbies and Leisure", "Recreational activities, leisure, crafts, gaming, music playing, outdoor relaxation, pastimes"),
    INDUSTRY(10, "Industry", "Heavy industry, factories, manufacturing, warehouses, construction sites, engineering, logistics infrastructure"),
    LANDSCAPES(11, "Landscapes", "Natural scenery, mountains, oceans, lakes, deserts, forests, wilderness, horizons, sunsets"),
    LIFESTYLE(12, "Lifestyle", "Everyday life, family routines, wellness, relationships, home life, leisure habits"),
    PEOPLE(13, "People", "Portraits, human figures, faces, people of all ages, beauty portraits, emotions, individual or group human subjects"),
    PLANTS_AND_FLOWERS(14, "Plants and Flowers", "Botany, flora, blossoms, trees, leaves, gardens, floral close-ups"),
    CULTURE_AND_RELIGION(15, "Culture and Religion", "Traditions, cultural celebrations, rituals, religious monuments, historical customs, festivities"),
    SCIENCE(16, "Science", "Scientific research, laboratories, medicine, healthcare, medical professionals, astronomy, chemistry, biology, technology in medicine"),
    SOCIAL_ISSUES(17, "Social Issues", "Societal topics, protests, poverty, diversity, community advocacy, human rights"),
    SPORTS(18, "Sports", "Athletics, competitive sports, workouts, fitness, gymnastics, marathons, recreation sports"),
    TECHNOLOGY(19, "Technology", "Computing, artificial intelligence, robotics, digital devices, modern gadgets, telecommunications, cyberspace"),
    TRANSPORT(20, "Transport", "Vehicles, automobiles, cars, trains, aviation, airplanes, boats, ships, traffic, roads, transit infrastructure"),
    TRAVEL(21, "Travel", "Tourism, vacation destinations, resorts, luggage, sightseeing, landmark touring, holiday voyages");

    private final int id;
    private final String name;
    private final String description;

    AdobeStockCategory(int id, String name, String description) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    private static final Map<Integer, AdobeStockCategory> BY_ID = new HashMap<>();
    private static final Map<String, AdobeStockCategory> BY_NAME = new HashMap<>();

    static {
        for (AdobeStockCategory cat : values()) {
            BY_ID.put(cat.id, cat);
            BY_NAME.put(cat.name.toLowerCase(Locale.ROOT), cat);
            BY_NAME.put(cat.name().toLowerCase(Locale.ROOT).replace('_', ' '), cat);
            BY_NAME.put(cat.name.toLowerCase(Locale.ROOT).replace(" and ", " & "), cat);
        }
    }

    public static AdobeStockCategory fromId(Integer id) {
        if (id == null) return null;
        return BY_ID.get(id);
    }

    public static AdobeStockCategory fromName(String name) {
        if (name == null || name.trim().isEmpty()) return null;
        String clean = name.trim().toLowerCase(Locale.ROOT);
        AdobeStockCategory direct = BY_NAME.get(clean);
        if (direct != null) return direct;

        // Try stripping numeric prefix if present (e.g. "13 - People" or "13. People")
        if (clean.matches("^\\d+\\s*[-.:]\\s*.*")) {
            String stripped = clean.replaceFirst("^\\d+\\s*[-.:]\\s*", "").trim();
            AdobeStockCategory strippedCat = BY_NAME.get(stripped);
            if (strippedCat != null) return strippedCat;
        }

        // Fuzzy match by checking if the name contains the category name or vice versa
        for (AdobeStockCategory cat : values()) {
            String catLower = cat.name.toLowerCase(Locale.ROOT);
            if (clean.equals(catLower) || clean.contains(catLower) || catLower.contains(clean)) {
                return cat;
            }
        }
        return null;
    }

    /**
     * Intelligently infers the most suitable Adobe Stock category based on
     * dominant visual subjects, environment, title, and keywords.
     * Uses strict whole-word token matching to prevent false substring matches
     * (e.g., prevents "skincare" or "carefree" from triggering "car" -> Transport).
     */
    public static AdobeStockCategory inferCategory(String title, String environment, List<String> subjects, List<String> keywords) {
        // Step 1: Inspect primary subjects if provided (dominant subject priority)
        if (subjects != null && !subjects.isEmpty()) {
            String subjectText = String.join(" ", subjects).toLowerCase(Locale.ROOT);

            // Close-up portraits and human facial subjects
            if (matchesWord(subjectText, "portrait", "beauty portrait", "face", "woman", "man", "person", "freckled", "redhead", "facial", "model", "headshot")) {
                // Ensure it's not primarily sports or business attire/meeting
                if (!matchesWord(subjectText, "athlete", "marathon", "football", "basketball", "workout")
                        && !matchesWord(subjectText, "meeting", "executive", "handshake", "office")) {
                    return PEOPLE;
                }
            }

            // Vehicles / Transport
            if (matchesWord(subjectText, "car", "automobile", "vehicle", "sports car", "electric car", "airplane", "aircraft", "train", "ship", "boat", "subway", "truck", "motorcycle", "yacht")) {
                return TRANSPORT;
            }

            // Food & Drink
            if (matchesWord(subjectText, "food", "burger", "pizza", "meal", "fruit", "vegetable", "dessert", "cake", "dish", "culinary", "recipe", "salad", "pasta")) {
                return FOOD;
            }
            if (matchesWord(subjectText, "cocktail", "coffee", "tea", "beer", "wine", "beverage", "juice", "whiskey", "drink")) {
                return DRINKS;
            }

            // Animals
            if (matchesWord(subjectText, "animal", "dog", "cat", "bird", "wildlife", "bear", "lion", "tiger", "elephant", "pet", "wolf", "deer", "fauna")) {
                return ANIMALS;
            }

            // Buildings and Architecture
            if (matchesWord(subjectText, "skyscraper", "building", "architecture", "facade", "house", "exterior", "skyline", "monument", "tower", "bridge")) {
                return BUILDINGS_AND_ARCHITECTURE;
            }

            // Plants and Flowers
            if (matchesWord(subjectText, "flower", "rose", "blossom", "plant", "garden", "flora", "botany", "tree", "leaf", "petals")) {
                return PLANTS_AND_FLOWERS;
            }

            // Sports
            if (matchesWord(subjectText, "sports", "athlete", "workout", "fitness", "gym", "marathon", "runner", "soccer", "football", "tennis", "swimming")) {
                return SPORTS;
            }

            // Business
            if (matchesWord(subjectText, "business", "meeting", "office", "executive", "corporate", "teamwork", "conference room", "boardroom")) {
                return BUSINESS;
            }
        }

        // Step 2: Combine full corpus with title, subjects, keywords, environment
        String corpus = String.join(" ",
                title != null ? title.toLowerCase(Locale.ROOT) : "",
                environment != null ? environment.toLowerCase(Locale.ROOT) : "",
                subjects != null ? String.join(" ", subjects).toLowerCase(Locale.ROOT) : "",
                keywords != null ? String.join(" ", keywords).toLowerCase(Locale.ROOT) : ""
        );

        // Portrait / Human subject check with high priority when visual indicators indicate portrait
        if (matchesWord(corpus, "portrait", "beauty portrait", "close-up portrait", "freckled", "freckles", "face", "headshot", "redhead woman", "facial features")) {
            return PEOPLE;
        }

        if (matchesWord(corpus, "dog", "cat", "bird", "wildlife", "animal", "pet", "fish", "lion", "tiger", "bear", "elephant", "safari", "fauna", "wolf", "mammal")) {
            return ANIMALS;
        }
        if (matchesWord(corpus, "cocktail", "coffee", "tea", "beer", "wine", "beverage", "juice", "whiskey", "bar", "smoothie", "espresso", "latte")) {
            return DRINKS;
        }
        if (matchesWord(corpus, "food", "burger", "pizza", "meal", "fruit", "vegetable", "dessert", "cake", "cooking", "restaurant", "bread", "dinner", "lunch", "cuisine", "gourmet", "dish", "gastronomy")) {
            return FOOD;
        }
        if (matchesWord(corpus, "flower", "flowers", "plant", "garden", "blossom", "botany", "leaf", "flora", "rose", "blooming", "petal", "foliage")) {
            return PLANTS_AND_FLOWERS;
        }
        if (matchesWord(corpus, "skyscraper", "skyline", "facade", "house", "urban architecture", "architectural", "exterior architecture", "interior design")) {
            return BUILDINGS_AND_ARCHITECTURE;
        }
        if (matchesWord(corpus, "car", "cars", "automobile", "automobiles", "airplane", "airplanes", "flight", "train", "trains", "vehicle", "vehicles", "traffic", "ship", "ships", "boat", "boats", "subway", "highway", "truck", "trucks", "motorcycle", "aircraft")) {
            return TRANSPORT;
        }
        if (matchesWord(corpus, "sports", "football", "soccer", "basketball", "athlete", "fitness", "workout", "gym", "marathon", "running", "tennis", "gymnastics", "runner")) {
            return SPORTS;
        }
        if (matchesWord(corpus, "science", "laboratory", "microscope", "chemistry", "physics", "dna", "medical", "doctor", "medicine", "pharmaceutical", "hospital", "biotechnology")) {
            return SCIENCE;
        }
        if (matchesWord(corpus, "business", "office", "executive", "corporate", "finance", "investment", "colleagues", "handshake", "consulting", "boardroom", "workplace")) {
            return BUSINESS;
        }
        if (matchesWord(corpus, "lifestyle", "hobby", "leisure", "relax", "yoga", "meditation", "reading", "home life", "wellness", "routine", "skincare", "cosmetics", "self care", "personal care")) {
            return LIFESTYLE;
        }
        if (matchesWord(corpus, "person", "man", "men", "woman", "women", "children", "people", "smile", "family", "worker", "girl", "boy", "human", "model", "models")) {
            return PEOPLE;
        }
        if (matchesWord(corpus, "travel", "vacation", "tourism", "destination", "resort", "hotel", "passport", "sightseeing", "tourist", "luggage", "voyage")) {
            return TRAVEL;
        }
        if (matchesWord(corpus, "mountain", "lake", "ocean", "landscape", "sunset", "sunrise", "nature", "scenery", "scenic", "river", "valley", "forest", "hills", "sea", "desert")) {
            return LANDSCAPES;
        }
        if (matchesWord(corpus, "factory", "industrial", "warehouse", "manufacturing", "crane", "engineer", "heavy industry", "logistics")) {
            return INDUSTRY;
        }
        if (matchesWord(corpus, "environment", "ecology", "green energy", "wind turbine", "solar panel", "recycling", "pollution", "climate", "conservation", "renewable")) {
            return THE_ENVIRONMENT;
        }
        if (matchesWord(corpus, "technology", "computer", "cyber", "robot", "artificial intelligence", "coding", "software", "circuit", "digital", "neon futuristic", "futuristic", "tech", "algorithm")) {
            return TECHNOLOGY;
        }
        if (matchesWord(corpus, "abstract", "background", "texture", "pattern", "3d render", "vector", "illustration", "wallpaper", "graphic", "bokeh")) {
            return GRAPHIC_RESOURCES;
        }

        // Default to Landscapes if broad nature or unclassified
        return LANDSCAPES;
    }

    private static final Map<String, java.util.regex.Pattern> WORD_PATTERNS = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Checks if any of the given words match as a distinct whole word (or plural) in the text.
     * Prevents false substring matches such as "skincare" matching "car".
     */
    private static boolean matchesWord(String text, String... words) {
        if (text == null || text.isBlank()) return false;
        for (String w : words) {
            if (w == null || w.isBlank()) continue;
            java.util.regex.Pattern p = WORD_PATTERNS.computeIfAbsent(w.toLowerCase(Locale.ROOT),
                    k -> java.util.regex.Pattern.compile("\\b" + java.util.regex.Pattern.quote(k) + "(s|es)?\\b", java.util.regex.Pattern.CASE_INSENSITIVE));
            if (p.matcher(text).find()) {
                return true;
            }
        }
        return false;
    }
}
