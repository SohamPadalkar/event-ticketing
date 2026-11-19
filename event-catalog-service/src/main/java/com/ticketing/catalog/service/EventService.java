package com.ticketing.catalog.service;

import com.ticketing.catalog.dto.CreateEventRequest;
import com.ticketing.catalog.dto.EventResponse;
import com.ticketing.catalog.entity.Event;
import com.ticketing.catalog.repository.EventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final EventRepository eventRepository;

    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional
    public EventResponse createEvent(CreateEventRequest request) {
        Event event = new Event(
                request.title(),
                request.description(),
                request.venue(),
                request.eventDate(),
                request.totalSeats(),
                request.ticketPrice()
        );

        Event savedEvent = eventRepository.save(event);

        return mapToResponse(savedEvent);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> getAllEvents() {
        return eventRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventResponse getEventById(UUID id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + id));
        return mapToResponse(event);
    }

    @Transactional
    public EventResponse reserveSeats(UUID eventId, int seatsToReserve) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found with id: " + eventId));

        if (event.getAvailableSeats() < seatsToReserve) {
            throw new IllegalStateException("Not enough seats available. Requested: "
                    + seatsToReserve + ", Available: " + event.getAvailableSeats());
        }

        event.setAvailableSeats(event.getAvailableSeats() - seatsToReserve);

        // When this @Transactional method exits, Hibernate flushes the UPDATE with WHERE version = ?
        Event updatedEvent = eventRepository.save(event);
        return mapToResponse(updatedEvent);
    }

    private EventResponse mapToResponse(Event event) {
        return new EventResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getVenue(),
                event.getEventDate(),
                event.getTotalSeats(),
                event.getAvailableSeats(),
                event.getTicketPrice()
        );
    }
}
