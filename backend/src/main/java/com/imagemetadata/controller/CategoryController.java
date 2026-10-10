package com.imagemetadata.controller;

import com.imagemetadata.dto.AdobeStockCategoryDto;
import com.imagemetadata.model.AdobeStockCategory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    @GetMapping
    public ResponseEntity<List<AdobeStockCategoryDto>> getAdobeStockCategories() {
        List<AdobeStockCategoryDto> categories = Arrays.stream(AdobeStockCategory.values())
                .map(cat -> AdobeStockCategoryDto.builder()
                        .id(cat.getId())
                        .name(cat.getName())
                        .description(cat.getDescription())
                        .build())
                .toList();

        return ResponseEntity.ok(categories);
    }
}
