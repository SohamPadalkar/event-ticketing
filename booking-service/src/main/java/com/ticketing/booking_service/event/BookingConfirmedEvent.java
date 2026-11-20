package com.ticketing.booking_service.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record BookingConfirmedEvent(
        UUID bookingId,
        UUID eventId,
        String customerEmail,
        Integer seatsBooked,
        BigDecimal totalAmount,
        LocalDateTime bookedAt
) {}