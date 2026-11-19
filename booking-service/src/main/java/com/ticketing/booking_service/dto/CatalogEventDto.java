package com.ticketing.booking_service.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CatalogEventDto(
        UUID id,
        String title,
        Integer availableSeats,
        BigDecimal ticketPrice
) {}