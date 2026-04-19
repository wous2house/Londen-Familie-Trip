export type Attraction = {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  imageUrls?: string[];
  location: string;
  lat: number;
  lng: number;
  ticketRequired: boolean;
  timeSlotRequired: boolean;
  openingHours: string;
  highlights: { title: string; description: string; icon: string }[];
  familyTip: string;
  city: 'Londen' | 'Oxford';
  bookingUrl?: string;
};

export const attractions: Attraction[] = [
  {
    id: 'tower-of-london',
    name: 'Tower of London',
    shortDescription: 'Historisch kasteel en bewaarplaats van de kroonjuwelen.',
    fullDescription: 'Stap in duizend jaar geschiedenis. Dit iconische fort, gesticht door Willem de Veroveraar in 1066, heeft gediend als koninklijk paleis, zwaarbeveiligde gevangenis en legendarisch arsenaal. De dikke stenen muren hebben de kroonjuwelen bewaakt en boden onderdak aan enkele van de beroemdste — en beruchtste — gevangenen van Engeland. Tegenwoordig staat het op de UNESCO Werelderfgoedlijst en nodigt het families uit om de geheimen van het verleden te ontdekken tussen de formidabele White Tower en de angstaanjagende Bloody Tower.',
    imageUrl: '',
    imageUrls: [],
    location: "St Katharine's & Wapping, Londen EC3N 4AB",
    lat: 51.5081,
    lng: -0.0759,
    ticketRequired: true,
    timeSlotRequired: true,
    openingHours: '09:00 - 17:30',
    highlights: [
      { title: 'De Kroonjuwelen', description: 'Bewonder \'s werelds beroemdste collectie goud, zilver en edelstenen.', icon: 'gem' },
      { title: 'The White Tower', description: 'Verken het oudste deel van het kasteel en de enorme wapencollectie.', icon: 'castle' },
      { title: 'De Raven', description: 'Ontmoet de legendarische bewakers van de Tower. Volgens de legende valt het koninkrijk als ze vertrekken.', icon: 'bird' },
      { title: 'Yeoman Warder Tour', description: 'Maak een beroemde \'Beefeater\' tour voor verhalen over intriges, executies en historie.', icon: 'users' }
    ],
    familyTip: 'Kom bij openingstijd aan om de Ceremonie van de Sleutels te zien. De kasseien zijn ongelijk, dus comfortabele schoenen en wandelwagens met goede wielen zijn aanbevolen.',
    city: 'Londen',
    bookingUrl: 'https://www.hrp.org.uk/tower-of-london/'
  },
  {
    id: 'london-eye',
    name: 'London Eye',
    shortDescription: 'Gigantisch reuzenrad met panoramisch uitzicht over de stad.',
    fullDescription: 'De lastminute.com London Eye is een iconisch onderdeel van de skyline van Londen. Het is het hoogste vrijdragende reuzenrad ter wereld en biedt een adembenemend 360-graden uitzicht over de hoofdstad. Een ritje duurt ongeveer 30 minuten in een van de 32 hightech glazen capsules.',
    imageUrl: '',
    imageUrls: [],
    location: 'Riverside Building, County Hall, Londen SE1 7PB',
    lat: 51.5033,
    lng: -0.1195,
    ticketRequired: true,
    timeSlotRequired: true,
    openingHours: '10:00 - 20:30',
    highlights: [
      { title: '360° Uitzicht', description: 'Kijk tot wel 40 km ver op een heldere dag.', icon: 'eye' },
      { title: '4D Cinema Experience', description: 'Inclusief bij je ticket, een leuke pre-flight show.', icon: 'film' }
    ],
    familyTip: 'Boek fast-track tickets als je met kleine kinderen reist om lange wachtrijen te vermijden.',
    city: 'Londen',
    bookingUrl: 'https://www.londoneye.com/tickets-and-prices/'
  },
  {
    id: 'natural-history-museum',
    name: 'Natural History Museum',
    shortDescription: 'Dinosauriërs, vulkanen en de wonderen van de natuur.',
    fullDescription: 'Een van de meest iconische en indrukwekkende gebouwen in Londen, het Natural History Museum herbergt honderden spannende, interactieve tentoonstellingen. Van brullende T-rexen tot glinsterende edelstenen, het is een fantastische plek voor nieuwsgierige geesten van alle leeftijden.',
    imageUrl: '',
    imageUrls: [],
    location: 'Cromwell Rd, South Kensington, Londen SW7 5BD',
    lat: 51.4967,
    lng: -0.1764,
    ticketRequired: false,
    timeSlotRequired: true,
    openingHours: '10:00 - 17:50',
    highlights: [
      { title: 'Dinosauriërs', description: 'Ontmoet de angstaanjagende animatronic T-Rex.', icon: 'bone' },
      { title: 'Earth Hall', description: 'Neem de roltrap door het midden van de aarde.', icon: 'globe' },
      { title: 'Hope de Walvis', description: 'Bewonder het gigantische skelet van de blauwe vinvis in de grote hal.', icon: 'fish' }
    ],
    familyTip: 'De toegang is gratis, maar het is sterk aanbevolen om vooraf een gratis tijdslot te reserveren om wachten te voorkomen.',
    city: 'Londen',
    bookingUrl: 'https://www.nhm.ac.uk/visit.html'
  },
  {
    id: 'big-ben',
    name: 'Big Ben & Parliament',
    shortDescription: 'De beroemdste klokkentoren ter wereld.',
    fullDescription: 'De Elizabeth Tower, beter bekend als de Big Ben, is misschien wel het meest iconische herkenningspunt van Londen. Gelegen aan de noordkant van het Palace of Westminster, is het een must-see voor elke bezoeker.',
    imageUrl: '',
    imageUrls: [],
    location: 'Londen SW1A 0AA',
    lat: 51.5007,
    lng: -0.1246,
    ticketRequired: false,
    timeSlotRequired: false,
    openingHours: '24/7 (buitenkant)',
    highlights: [
      { title: 'De Klok', description: 'Hoor de beroemde bongs op het hele uur.', icon: 'clock' },
      { title: 'Westminster Bridge', description: 'De beste plek voor een familiefoto met de toren op de achtergrond.', icon: 'camera' }
    ],
    familyTip: 'Je kunt de toren zelf niet zomaar in, maar een wandeling over Westminster Bridge biedt de beste fotomomenten.',
    city: 'Londen',
    bookingUrl: 'https://www.parliament.uk/visiting/'
  },
  {
    id: 'christ-church-oxford',
    name: 'Christ Church College',
    shortDescription: 'Beroemd college, bekend van Harry Potter.',
    fullDescription: 'Christ Church is een van de grootste en mooiste colleges van de Universiteit van Oxford. Het is beroemd om zijn prachtige architectuur, de kathedraal en de Great Hall, die de inspiratie vormde voor de eetzaal van Zweinstein in de Harry Potter-films.',
    imageUrl: '',
    imageUrls: [],
    location: 'St Aldates, Oxford OX1 1DP',
    lat: 51.7502,
    lng: -1.2562,
    ticketRequired: true,
    timeSlotRequired: false,
    openingHours: '10:00 - 17:00 (tijden variëren)',
    highlights: [
      { title: 'The Great Hall', description: 'De inspiratie voor Zweinstein\'s Grote Zaal.', icon: 'utensils' },
      { title: 'Tom Tower', description: 'Ontworpen door Christopher Wren.', icon: 'bell' }
    ],
    familyTip: 'Voor Harry Potter fans is dit een absolute must. Boek tickets wel ruim van tevoren!',
    city: 'Oxford',
    bookingUrl: 'https://www.chch.ox.ac.uk/plan-your-visit/'
  },
  {
    id: 'oxford-university-museum',
    name: 'Oxford University Museum of Natural History',
    shortDescription: 'Prachtig museum vol dinosaurusskeletten en dodo-resten.',
    fullDescription: 'Dit museum herbergt de internationaal belangrijke collecties geologische en zoölogische specimens van de universiteit. Het prachtige neogotische gebouw is op zichzelf al een bezienswaardigheid, met een glazen dak en gietijzeren pilaren.',
    imageUrl: '',
    imageUrls: [],
    location: 'Parks Rd, Oxford OX1 3PW',
    lat: 51.7587,
    lng: -1.2557,
    ticketRequired: false,
    timeSlotRequired: false,
    openingHours: '10:00 - 17:00',
    highlights: [
      { title: 'Dinosaurussen', description: 'Indrukwekkende skeletten in de grote hal.', icon: 'bone' },
      { title: 'De Oxford Dodo', description: 'De meest complete overblijfselen van een dodo ter wereld.', icon: 'bird' }
    ],
    familyTip: 'Perfect voor een regenachtige dag. Je kunt de tentoongestelde objecten vaak van heel dichtbij bekijken.',
    city: 'Oxford',
    bookingUrl: 'https://www.oumnh.ox.ac.uk/visit-us'
  }
];
