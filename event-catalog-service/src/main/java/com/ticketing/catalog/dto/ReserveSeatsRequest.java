package com.ticketing.catalog.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ReserveSeatsRequest(
        @NotNull(message = "Seat count is required")
        @Min(value = 1, message = "Must reserve at least 1 seat")
        Integer seats
) {}