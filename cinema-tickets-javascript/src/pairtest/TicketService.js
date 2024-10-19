import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';

export default class TicketService {
  #paymentService;
  #reservationService;
  #TICKET_PRICES;

  constructor() {
    this.#paymentService = new TicketPaymentService();
    this.#reservationService = new SeatReservationService();

    // Set ticket prices based on type
    this.#TICKET_PRICES = {
      INFANT: 0,
      CHILD: 15,
      ADULT: 25
    };
  }

  purchaseTickets(accountId, ...ticketTypeRequests) {
    try {
      // Validate the account ID provided by the user
      this.#validateAccountId(accountId);
      
      // Validate the ticket requests to ensure they meet the business rules
      this.#validateTicketRequests(ticketTypeRequests);

      // Calculate the total amount to be paid and the number of seats to reserve
      const { totalAmount, totalSeats } = this.#calculateTotals(ticketTypeRequests);
      
      // Process the payment for the total amount
      this.#paymentService.makePayment(accountId, totalAmount);
      
      // Reserve seats based on the number of tickets purchased
      this.#reservationService.reserveSeat(accountId, totalSeats);
    } catch (error) {
      if (error instanceof InvalidPurchaseException) {
        throw error;
      }
      throw new InvalidPurchaseException(error.message);
    }
  }

  #validateAccountId(accountId) {
    // Ensure the account ID is a positive integer
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new InvalidPurchaseException('Invalid account ID');
    }
  }

  #validateTicketRequests(ticketTypeRequests) {
    // Check if any tickets have been requested
    if (!ticketTypeRequests || ticketTypeRequests.length === 0) {
      throw new InvalidPurchaseException('No tickets requested');
    }

    // Initialize counts for each type of ticket
    const ticketCounts = {
      INFANT: 0,
      CHILD: 0,
      ADULT: 0
    };

    // Count the number of each type of ticket requested
    ticketTypeRequests.forEach(request => {
      if (!(request instanceof TicketTypeRequest)) {
        throw new InvalidPurchaseException('Invalid ticket request type');
      }
      ticketCounts[request.getTicketType()] += request.getNoOfTickets();
    });

    const totalTickets = Object.values(ticketCounts).reduce((sum, count) => sum + count, 0);

    // Ensure that no more than 25 tickets are purchased in one transaction
    if (totalTickets > 25) {
      throw new InvalidPurchaseException('Maximum 25 tickets per purchase');
    }

    // Ensure that at least one adult ticket is included with any child or infant tickets
    if (ticketCounts.ADULT === 0 && (ticketCounts.INFANT > 0 || ticketCounts.CHILD > 0)) {
      throw new InvalidPurchaseException('Child and Infant tickets require an Adult ticket');
    }

    // Each infant ticket must be accompanied by an adult ticket
    if (ticketCounts.INFANT > ticketCounts.ADULT) {
      throw new InvalidPurchaseException('Each infant requires an adult lap');
    }
  }

  #calculateTotals(ticketTypeRequests) {
    let totalAmount = 0;
    let totalSeats = 0;

    ticketTypeRequests.forEach(request => {
      const type = request.getTicketType();      // Get the type of ticket
      const quantity = request.getNoOfTickets(); // Get the number of tickets requested

      // Calculate the total amount based on ticket prices
      totalAmount += this.#TICKET_PRICES[type] * quantity;

      // Count only the seats for CHILD and ADULT tickets (INFANTS do not require a seat)
      if (type !== 'INFANT') {
        totalSeats += quantity;
      }
    });

    return { totalAmount, totalSeats }; // Return the calculated totals
  }
}
