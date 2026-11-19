package com.ticketing.booking_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient catalogRestClient(@Value("${services.catalog.url}") String catalogBaseUrl) {
        return RestClient.builder()
                .baseUrl(catalogBaseUrl)
                .build();
    }
}