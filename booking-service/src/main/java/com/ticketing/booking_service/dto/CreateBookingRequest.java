package com.ticketing.booking_service.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record CreateBookingRequest(
        @NotNull(message = "Event ID is required")
        UUID eventId,

        @NotBlank(message = "Customer email is required")
        @Email(message = "Must be a valid email address")
        String customerEmail,

        @NotNull(message = "Seat count is required")
        @Min(value = 1, message = "Must book at least 1 seat")
        Integer seats
) {}