package com.ticketing.catalog.controller;

import com.ticketing.catalog.dto.CreateEventRequest;
import com.ticketing.catalog.dto.EventResponse;
import com.ticketing.catalog.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody CreateEventRequest request) {
        EventResponse created = eventService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable UUID id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @PostMapping("/{id}/reserve")
    public ResponseEntity<EventResponse> reserveSeats(
            @PathVariable UUID id,
            @Valid @RequestBody com.ticketing.catalog.dto.ReserveSeatsRequest request) {
        return ResponseEntity.ok(eventService.reserveSeats(id, request.seats()));
    }
}