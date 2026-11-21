package com.ticketing.booking_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    @LoadBalanced
    public RestClient.Builder loadBalancedRestClientBuilder() {
        return RestClient.builder();
    }

    @Bean
    public RestClient catalogRestClient(RestClient.Builder builder,
                                        @Value("${services.catalog.url}") String catalogBaseUrl) {
        return builder.baseUrl(catalogBaseUrl).build();
    }
}