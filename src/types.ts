export type WeekDay = 
| 'domingo'
| 'segunda'
| 'terca'
| 'quarta'
| 'quinta'
| 'sexta'
| 'sabado'

export type ServiceItem = {
  id: string;
  name: string;
  price: number;
  durationInMinutes: number;
};

export type WorkingHour = {
  start: string;
  end: string;
};

export type BarbershopSettings = {
  id: string;
  name: string;
  phoneOwner?: string;
  welcomeMessage: string;   
  pixKey?: string;
  workingDays: WeekDay[];
  workingHours: WorkingHour;
  breakStart?: string;
  breakEnd?: string;
  intervalBetweenAppointments: number;
  services: ServiceItem []
};

export type Booking = {
  id: string;
  barbershopId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  day: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
};

export type ConversationState = {
    step:
    | 'Idle'
    | 'Awaiting_Name'
    | 'AWaiting_Message'
    | 'Awaiting_Service_Selection'
    | 'Awaiting_Day'
    | 'Awaiting_Time'
  customerName?: string;
  serviceId?: string;
  day?: string;
};