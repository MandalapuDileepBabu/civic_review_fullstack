import { topicImage, topicImageFallback } from "./images";

export const newsTopics = [
  {
    id: "water",
    title: "Water & Clean Rivers",
    description: "Community efforts to keep water bodies clean, safe, and sustainable for all.",
    get image() {
      return topicImage("water");
    },
    imageFallback: topicImageFallback("water"),
  },
  {
    id: "roads",
    title: "Road & Street Cleanliness",
    description: "Neighborhood teams working together for safer, cleaner roads and public spaces.",
    get image() {
      return topicImage("roads");
    },
    imageFallback: topicImageFallback("roads"),
  },
  {
    id: "waste",
    title: "Waste Management",
    description: "Recycling drives, segregation awareness, and reducing landfill waste.",
    get image() {
      return topicImage("waste");
    },
    imageFallback: topicImageFallback("waste"),
  },
  {
    id: "air",
    title: "Air Quality",
    description: "Monitoring pollution and planting trees for cleaner air in our cities.",
    get image() {
      return topicImage("air");
    },
    imageFallback: topicImageFallback("air"),
  },
  {
    id: "community",
    title: "Community Cleanups",
    description: "Join local groups with similar interests to beautify parks and neighborhoods.",
    get image() {
      return topicImage("community");
    },
    imageFallback: topicImageFallback("community"),
  },
];

export const interestTags = [
  "Water Conservation",
  "Road Cleanliness",
  "Waste Recycling",
  "Air Quality",
  "Park Maintenance",
  "Gated Society",
  "Public Safety",
  "Green Energy",
];
