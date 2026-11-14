package com.ticketing.catalog.dto;

import jakarta.validation.constraints.*;
import org.springframework.cglib.core.Local;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateEventRequest (
    @NotBlank(message = "Title is required")
    String title,

    String description,

    @NotBlank(message = "Venue is required")
    String venue,

    @NotNull(message = "Event date is required")
    @Future(message = "Event date must be in the future")
    LocalDateTime eventDate,

    @NotNull(message = "Total seats is required")
    @Min(value = 1, message = "Event must have at least 1 seat")
    Integer totalSeats,

    @NotNull(message = "Ticket price is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Price can not be negative")
    BigDecimal ticketPrice
) {}
