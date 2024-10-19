import TicketService from '../src/pairtest/TicketService.js';
import TicketTypeRequest from '../src/pairtest/lib/TicketTypeRequest.js';
import InvalidPurchaseException from '../src/pairtest/lib/InvalidPurchaseException.js';
import TicketPaymentService from '../src/thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../src/thirdparty/seatbooking/SeatReservationService.js';

jest.mock('../src/thirdparty/paymentgateway/TicketPaymentService.js');
jest.mock('../src/thirdparty/seatbooking/SeatReservationService.js');

describe('TicketService', () => {
  let ticketService;

  beforeEach(() => {
    ticketService = new TicketService();
  });

  test('Should successfully purchase tickets', () => {
    const requests = [
      new TicketTypeRequest('ADULT', 1),
      new TicketTypeRequest('CHILD', 1),
      new TicketTypeRequest('INFANT', 1)
    ];

    ticketService.purchaseTickets(1, ...requests);

    expect(TicketPaymentService.prototype.makePayment).toHaveBeenCalledWith(1, 40);
    expect(SeatReservationService.prototype.reserveSeat).toHaveBeenCalledWith(1, 2);
  });

  test('Should throw error if no tickets are provided', () => {
    expect(() => ticketService.purchaseTickets(1)).toThrow(InvalidPurchaseException);
  });

  test('Should throw error if more than 25 tickets are requested', () => {
    const requests = Array(100).fill(new TicketTypeRequest('ADULT', 1));
    expect(() => ticketService.purchaseTickets(1, ...requests)).toThrow(InvalidPurchaseException);
  });

  test('Should throw error if no adult ticket is included with child or infant', () => {
    const requests = [
      new TicketTypeRequest('CHILD', 100)
    ];
    expect(() => ticketService.purchaseTickets(1, ...requests)).toThrow(InvalidPurchaseException);
  });

  test('Should throw error for invalid account ID', () => {
    const requests = [
      new TicketTypeRequest('ADULT', 1)
    ];
    expect(() => ticketService.purchaseTickets(-1, ...requests)).toThrow(InvalidPurchaseException);
  });

  test('Should calculate seats to reserve and make a seat reservation request', () => {
    const requests = [
      new TicketTypeRequest('ADULT', 15),
      new TicketTypeRequest('CHILD', 10)
    ];
  
    ticketService.purchaseTickets(2, ...requests);
  
    expect(SeatReservationService.prototype.reserveSeat).toHaveBeenCalledWith(1, 2);
  });

  test('should throw error when number of infants exceeds adults', () => {
    const requests = [
      new TicketTypeRequest('INFANT', 2),
      new TicketTypeRequest('ADULT', 1)
    ];

    expect(() => ticketService.purchaseTickets(1, ...requests)).toThrow(
      new InvalidPurchaseException('Each infant requires an adult lap')
    );
  });

  test('should allow purchase when number of infants does not exceed adults', () => {
    const requests = [
      new TicketTypeRequest('INFANT', 1),
      new TicketTypeRequest('ADULT', 1)
    ];
    expect(() => ticketService.purchaseTickets(1, ...requests)).not.toThrow();
  });
});
