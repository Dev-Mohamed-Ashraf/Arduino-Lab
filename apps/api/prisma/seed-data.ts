/**
 * Initial lab data.
 *
 * Component names stay in English because that is how the parts are labelled on
 * the shelves and in every datasheet; the Arabic description is what the UI
 * shows alongside them.
 */

export interface TimeSlotSeed {
  label: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  capacity: number;
}

export interface ComponentSeed {
  name: string;
  sku: string;
  description: string;
  totalQuantity: number;
}

/** The four fixed lab periods, 11:00 to 15:00. */
export const TIME_SLOTS: TimeSlotSeed[] = [
  { label: '11:00 - 12:00', startTime: '11:00', endTime: '12:00', sortOrder: 1, capacity: 5 },
  { label: '12:00 - 13:00', startTime: '12:00', endTime: '13:00', sortOrder: 2, capacity: 5 },
  { label: '13:00 - 14:00', startTime: '13:00', endTime: '14:00', sortOrder: 3, capacity: 5 },
  { label: '14:00 - 15:00', startTime: '14:00', endTime: '15:00', sortOrder: 4, capacity: 5 },
];

export const COMPONENTS: ComponentSeed[] = [
  // Boards
  { name: 'Arduino Uno R3', sku: 'BRD-UNO', description: 'لوحة أردوينو أونو R3', totalQuantity: 30 },
  { name: 'Arduino Nano', sku: 'BRD-NANO', description: 'لوحة أردوينو نانو', totalQuantity: 15 },
  { name: 'Arduino Mega 2560', sku: 'BRD-MEGA', description: 'لوحة أردوينو ميجا 2560', totalQuantity: 8 },
  { name: 'ESP8266 NodeMCU', sku: 'BRD-ESP8266', description: 'لوحة NodeMCU بواي فاي', totalQuantity: 12 },
  { name: 'ESP32 DevKit', sku: 'BRD-ESP32', description: 'لوحة ESP32 بواي فاي وبلوتوث', totalQuantity: 10 },

  // Prototyping
  { name: 'Breadboard 830 Points', sku: 'PRO-BB830', description: 'لوحة تجارب 830 نقطة', totalQuantity: 30 },
  { name: 'Jumper Wires Male-Male (40)', sku: 'PRO-JWMM', description: 'أسلاك توصيل ذكر-ذكر، طقم 40', totalQuantity: 40 },
  { name: 'Jumper Wires Male-Female (40)', sku: 'PRO-JWMF', description: 'أسلاك توصيل ذكر-أنثى، طقم 40', totalQuantity: 30 },
  { name: 'USB Cable Type-B', sku: 'PRO-USBB', description: 'كابل USB نوع B للأردوينو', totalQuantity: 30 },
  { name: '9V Battery Holder', sku: 'PRO-BAT9V', description: 'حامل بطارية 9 فولت', totalQuantity: 20 },

  // Output
  { name: 'LED 5mm (Assorted)', sku: 'OUT-LED5', description: 'لمبات ليد 5 مم بألوان مختلفة', totalQuantity: 100 },
  { name: 'RGB LED', sku: 'OUT-LEDRGB', description: 'ليد ثلاثي اللون RGB', totalQuantity: 25 },
  { name: 'Buzzer (Active)', sku: 'OUT-BUZZ', description: 'صفارة نشطة', totalQuantity: 25 },
  { name: 'LCD 16x2 with I2C', sku: 'OUT-LCD16', description: 'شاشة LCD 16×2 مع وحدة I2C', totalQuantity: 15 },
  { name: 'OLED Display 0.96"', sku: 'OUT-OLED', description: 'شاشة OLED مقاس 0.96 بوصة', totalQuantity: 10 },
  { name: '7-Segment Display', sku: 'OUT-7SEG', description: 'شاشة سبعة أجزاء', totalQuantity: 20 },

  // Input / sensors
  { name: 'Push Button', sku: 'IN-BTN', description: 'زر ضغط', totalQuantity: 60 },
  { name: 'Potentiometer 10K', sku: 'IN-POT10K', description: 'مقاومة متغيرة 10 كيلو أوم', totalQuantity: 30 },
  { name: 'LDR Photoresistor', sku: 'IN-LDR', description: 'مقاومة ضوئية', totalQuantity: 40 },
  { name: 'Ultrasonic Sensor HC-SR04', sku: 'SEN-HCSR04', description: 'حساس مسافة بالموجات فوق الصوتية', totalQuantity: 25 },
  { name: 'DHT11 Temperature & Humidity', sku: 'SEN-DHT11', description: 'حساس حرارة ورطوبة', totalQuantity: 20 },
  { name: 'IR Obstacle Sensor', sku: 'SEN-IR', description: 'حساس أشعة تحت حمراء للعوائق', totalQuantity: 20 },
  { name: 'PIR Motion Sensor HC-SR501', sku: 'SEN-PIR', description: 'حساس حركة', totalQuantity: 15 },
  { name: 'Soil Moisture Sensor', sku: 'SEN-SOIL', description: 'حساس رطوبة التربة', totalQuantity: 15 },
  { name: 'MQ-2 Gas Sensor', sku: 'SEN-MQ2', description: 'حساس غاز ودخان', totalQuantity: 10 },
  { name: 'Flame Sensor', sku: 'SEN-FLAME', description: 'حساس لهب', totalQuantity: 10 },
  { name: 'Keypad 4x4', sku: 'IN-KEY44', description: 'لوحة مفاتيح 4×4', totalQuantity: 12 },
  { name: 'RFID Module RC522', sku: 'SEN-RC522', description: 'وحدة قراءة بطاقات RFID', totalQuantity: 10 },

  // Actuators
  { name: 'Servo Motor SG90', sku: 'ACT-SG90', description: 'موتور سيرفو SG90', totalQuantity: 30 },
  { name: 'DC Motor 6V', sku: 'ACT-DC6V', description: 'موتور تيار مستمر 6 فولت', totalQuantity: 25 },
  { name: 'Stepper Motor 28BYJ-48', sku: 'ACT-28BYJ', description: 'موتور خطوي مع دارة قيادة', totalQuantity: 12 },
  { name: 'Motor Driver L298N', sku: 'ACT-L298N', description: 'وحدة قيادة موتور L298N', totalQuantity: 15 },
  { name: 'Relay Module 5V', sku: 'ACT-RELAY', description: 'وحدة ريلاي 5 فولت', totalQuantity: 20 },
  { name: 'Water Pump 5V', sku: 'ACT-PUMP', description: 'مضخة ماء صغيرة 5 فولت', totalQuantity: 8 },

  // Communication
  { name: 'Bluetooth Module HC-05', sku: 'COM-HC05', description: 'وحدة بلوتوث HC-05', totalQuantity: 15 },
  { name: 'GPS Module NEO-6M', sku: 'COM-NEO6M', description: 'وحدة تحديد المواقع GPS', totalQuantity: 6 },

  // Passive
  { name: 'Resistor Kit (600 pcs)', sku: 'PAS-RESKIT', description: 'طقم مقاومات 600 قطعة', totalQuantity: 20 },
  { name: 'Capacitor Kit', sku: 'PAS-CAPKIT', description: 'طقم مكثفات', totalQuantity: 15 },
];
