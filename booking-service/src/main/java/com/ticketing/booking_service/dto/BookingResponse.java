package com.ticketing.booking_service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookingResponse(
        UUID bookingId,
        UUID eventId,
        String customerEmail,
        Integer seatsBooked,
        BigDecimal totalAmount,
        String status,
        LocalDateTime bookedAt
) {}