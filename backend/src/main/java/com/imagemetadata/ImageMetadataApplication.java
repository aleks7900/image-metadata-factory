package com.imagemetadata;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class ImageMetadataApplication {

    public static void main(String[] args) {
        SpringApplication.run(ImageMetadataApplication.class, args);
    }
}
