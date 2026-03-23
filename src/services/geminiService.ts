import { GoogleGenAI, Type } from "@google/genai";
import { calculateDistance } from "./distanceService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface TripPlan {
  destinations: {
    type: string;
    name: string;
    cost: number;
    distance: string;
    score: number;
    rating: number;
    imageKeyword: string;
    vlogTitle: string;
  }[];
  transportOptions: {
    type: 'Train' | 'Government Bus' | 'Private Bus';
    name?: string;
    number?: string;
    busType?: string;
    departureLocation?: string;
    departureTime: string;
    arrivalTime: string;
    duration?: string;
    cost: number;
  }[];
  itinerary: {
    day: number;
    activities: {
      time: string;
      title: string;
      desc: string;
      cost: number;
      distanceFromPrevious?: string;
      locationQuery?: string;
    }[];
  }[];
  hotels: {
    name: string;
    description: string;
    costPerNight: number;
    rating: number;
    location: string;
    imageKeyword: string;
  }[];
  restaurants: {
    name: string;
    cuisine: string;
    description: string;
    avgCostPerPerson: number;
    rating: number;
    location: string;
    imageKeyword: string;
  }[];
  emergencyContacts: {
    hospital: string;
    police: string;
    helpline: string;
  };
  vlogIdeas: {
    title: string;
    hook: string;
    description: string;
    thumbnailIdea: string;
  }[];
}

export interface EventPlan {
  eventType: string;
  budget: number;
  guests: number;
  location: string;
  budgetBreakdown: {
    category: string;
    allocatedAmount: number;
    percentage: number;
    description: string;
  }[];
  checklist: {
    task: string;
    priority: 'High' | 'Medium' | 'Low';
    timeline: string;
  }[];
  vendors: {
    type: string;
    name: string;
    estimatedCost: number;
    rating: number;
    description: string;
  }[];
  itinerary: {
    time: string;
    activity: string;
  }[];
}

export async function generateEventPlan(
  eventType: string,
  budget: number,
  guests: number,
  location: string,
  selectedServices: string[] = []
): Promise<EventPlan> {
  const servicesText = selectedServices.length > 0 
    ? `The user has specifically requested these services: ${selectedServices.join(', ')}. ` 
    : '';

  const prompt = `
    You are an expert AI Event Planner. Create a detailed event plan for a ${eventType}.
    BUDGET: ₹${budget}.
    GUESTS: ${guests}.
    LOCATION: ${location}.
    ${servicesText}

    Provide a detailed budget breakdown, a comprehensive checklist of tasks, recommended vendor types with estimated costs, and a sample event day itinerary.

    CRITICAL: You MUST include the requested services in the budget breakdown and vendor list.
    All costs must be in INR and must sum up to the total budget.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          eventType: { type: Type.STRING },
          budget: { type: Type.NUMBER },
          guests: { type: Type.NUMBER },
          location: { type: Type.STRING },
          budgetBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "e.g., Venue, Catering, Decor" },
                allocatedAmount: { type: Type.NUMBER },
                percentage: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["category", "allocatedAmount", "percentage", "description"]
            }
          },
          checklist: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                timeline: { type: Type.STRING, description: "e.g., 3 months before, Day of event" }
              },
              required: ["task", "priority", "timeline"]
            }
          },
          vendors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "e.g., Photographer, Florist" },
                name: { type: Type.STRING, description: "A realistic placeholder or real vendor name" },
                estimatedCost: { type: Type.NUMBER },
                rating: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["type", "name", "estimatedCost", "rating", "description"]
            }
          },
          itinerary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                activity: { type: Type.STRING }
              },
              required: ["time", "activity"]
            }
          }
        },
        required: ["eventType", "budget", "guests", "location", "budgetBreakdown", "checklist", "vendors", "itinerary"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Failed to generate event plan");
  }

  return JSON.parse(text) as EventPlan;
}

export async function generateTripPlan(
  totalTripBudget: number,
  numberOfPeople: number,
  numberOfDays: number,
  departureCity: string,
  destinationPreference: string,
  destinationCategory?: string,
  tripStartTime?: string
): Promise<TripPlan> {
  const categoryText = destinationCategory ? `Category: ${destinationCategory}. ` : '';
  const isSolo = numberOfPeople === 1;
  const startTimeText = tripStartTime ? `The user wants to depart after ${tripStartTime}. ` : '';
  
  const soloInstructions = isSolo ? `
    ACTIVATE SOLO TRAVEL MODE:
    1. Recommend safe solo travel locations.
    2. Focus on Viewpoints, Photography spots, Adventure locations, and Biker friendly roads.
    3. Ensure the itinerary is optimized for a single traveler.
    4. Emergency contacts MUST include a real nearby police station, hospital, and a general emergency helpline number for the region.
  ` : '';

  const prompt = `
    You are an expert AI travel planner. Create a detailed budget trip plan for ${numberOfPeople} people.
    TOTAL TRIP BUDGET: ₹${totalTripBudget}. (You must internally distribute this budget across transport, stay, food, and activities for all people).
    The trip duration is ${numberOfDays} days.
    The departure city is ${departureCity}.
    The destination preference is ${categoryText}${destinationPreference || 'any suitable place'}.
    ${startTimeText}

    ${soloInstructions}

    CRITICAL RULES:
    1. Never use default values or fake locations.
    2. All calculations must be real-time and dynamic.
    3. Tourist spots and restaurants must come from real travel data.
    4. If the user selects ${numberOfDays} days, you MUST generate exactly ${numberOfDays} day plans.
    5. The very first activity on Day 1 MUST be the departure from ${departureCity}, including the departure time (e.g., 5:00 AM), the travel journey to the destination, and the arrival time at the destination.
    6. DO NOT generate alternative destination comparisons. Generate ONE single cohesive trip plan that covers the requested destination(s). If multiple destinations are provided, plan a logical round-trip route covering them.

    TRANSPORT DISCOVERY ENGINE:
    Generate a "transportOptions" array with real transport services from ${departureCity} to the main destination.
    1. Only include services departing AFTER ${tripStartTime || 'the earliest possible time'}.
    2. Supported types: "Train", "Government Bus", "Private Bus".
    3. For Train: Include 'name', 'number', 'departureTime', 'arrivalTime', and 'duration'.
    4. For Bus: Include 'busType', 'departureLocation', 'departureTime', and 'arrivalTime'.
    5. BUDGET MODE: Prioritize Train routes and Government buses as they are low-cost.
    6. Provide at least 3-4 varied options.

    First, provide a "destinations" array listing the main cities or regions covered in this single trip. 
    For each place, provide its 'type' (e.g., "Main Destination", "Stopover", "Day Trip"), 'name', a realistic estimated 'cost' (total for all people) spent there, the 'distance' from the previous stop (or departure city), a 'score' (out of 10), a 'rating' (out of 5), an 'imageKeyword', and a 'vlogTitle'.

    Then, generate a detailed day-by-day master itinerary for this entire trip.
    The itinerary must cover all ${numberOfDays} days.
    Each day must include a realistic time schedule, real tourist spots, and nearby affordable restaurants for breakfast, lunch, and dinner.
    Include estimated costs for each activity/meal (total for all people).
    For EACH activity, you MUST provide:
    - 'distanceFromPrevious': The estimated distance in KM from the previous activity's location (e.g., "15 km"). For the very first activity, this can be "0 km".
    - 'locationQuery': The exact name of the place or restaurant to be used for Google Maps navigation (e.g., "Hotel Saravana Bhavan, Ooty").

    Also provide a "hotels" array with 2-3 real budget-friendly accommodation options at the main destination.
    Include 'name', 'description', 'costPerNight' (total for all people), 'rating', 'location', and 'imageKeyword'.

    Also provide a "restaurants" array with 3-4 real affordable restaurant suggestions.
    Include 'name', 'cuisine', 'description', 'avgCostPerPerson', 'rating', 'location', and 'imageKeyword'.

    Also provide real emergency contacts for the main destination(s), including:
    - 'hospital': Name and distance of a real hospital.
    - 'police': Name and distance of a real police station.
    - 'helpline': A real emergency helpline number (e.g., "100", "108", or local emergency number).

    VLOG ENGINE:
    Provide a "vlogIdeas" array with 3-4 creative YouTube vlog concepts for this specific trip.
    Include 'title' (catchy), 'hook' (first 10 seconds), 'description' (what to film), and 'thumbnailIdea'.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          destinations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "e.g., BEST MATCH, CHEAPEST, PREMIUM EXPERIENCE" },
                name: { type: Type.STRING, description: "City or place name" },
                cost: { type: Type.NUMBER, description: "Estimated total cost in INR" },
                distance: { type: Type.STRING, description: "Real driving distance, e.g., '420 km'" },
                score: { type: Type.NUMBER, description: "Popularity score out of 10" },
                rating: { type: Type.NUMBER, description: "Rating out of 5" },
                imageKeyword: { type: Type.STRING, description: "A single word or short phrase for image search, e.g., 'ooty'" },
                vlogTitle: { type: Type.STRING, description: "A realistic YouTube vlog title" }
              },
              required: ["type", "name", "cost", "distance", "score", "rating", "imageKeyword", "vlogTitle"]
            }
          },
          transportOptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["Train", "Government Bus", "Private Bus"] },
                name: { type: Type.STRING, description: "Train Name (for Train)" },
                number: { type: Type.STRING, description: "Train Number (for Train)" },
                busType: { type: Type.STRING, description: "e.g., AC Sleeper, Non-AC Seater (for Bus)" },
                departureLocation: { type: Type.STRING, description: "Departure Point (for Bus)" },
                departureTime: { type: Type.STRING, description: "e.g., 07:30 PM" },
                arrivalTime: { type: Type.STRING, description: "e.g., 05:00 AM" },
                duration: { type: Type.STRING, description: "e.g., 9h 30m (for Train)" },
                cost: { type: Type.NUMBER, description: "Cost per person in INR" }
              },
              required: ["type", "departureTime", "arrivalTime", "cost"]
            }
          },
          itinerary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                activities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING, description: "e.g., 08:00 AM" },
                      title: { type: Type.STRING, description: "Activity or meal type, e.g., Breakfast, Botanical Garden" },
                      desc: { type: Type.STRING, description: "Location name or description" },
                      cost: { type: Type.NUMBER, description: "Estimated total cost in INR" },
                      distanceFromPrevious: { type: Type.STRING, description: "Distance from previous location in KM, e.g., '15 km'" },
                      locationQuery: { type: Type.STRING, description: "Exact location name for Google Maps, e.g., 'Botanical Garden, Ooty'" }
                    },
                    required: ["time", "title", "desc", "cost", "distanceFromPrevious", "locationQuery"]
                  }
                }
              },
              required: ["day", "activities"]
            }
          },
          hotels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                costPerNight: { type: Type.NUMBER },
                rating: { type: Type.NUMBER },
                location: { type: Type.STRING },
                imageKeyword: { type: Type.STRING }
              },
              required: ["name", "description", "costPerNight", "rating", "location", "imageKeyword"]
            }
          },
          restaurants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                cuisine: { type: Type.STRING },
                description: { type: Type.STRING },
                avgCostPerPerson: { type: Type.NUMBER },
                rating: { type: Type.NUMBER },
                location: { type: Type.STRING },
                imageKeyword: { type: Type.STRING }
              },
              required: ["name", "cuisine", "description", "avgCostPerPerson", "rating", "location", "imageKeyword"]
            }
          },
          emergencyContacts: {
            type: Type.OBJECT,
            properties: {
              hospital: { type: Type.STRING, description: "Real hospital name and distance, e.g., 'Govt Hospital (2km)'" },
              police: { type: Type.STRING, description: "Real police station name and distance, e.g., 'Local Station (1.5km)'" },
              helpline: { type: Type.STRING, description: "Real emergency helpline number, e.g., '108'" }
            },
            required: ["hospital", "police", "helpline"]
          },
          vlogIdeas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                hook: { type: Type.STRING },
                description: { type: Type.STRING },
                thumbnailIdea: { type: Type.STRING }
              },
              required: ["title", "hook", "description", "thumbnailIdea"]
            }
          }
        },
        required: ["destinations", "transportOptions", "itinerary", "hotels", "restaurants", "emergencyContacts", "vlogIdeas"]
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("Failed to generate trip plan");
  }

  const plan = JSON.parse(text) as TripPlan;

  // Calculate real distances
  for (const dest of plan.destinations) {
    const distanceData = await calculateDistance(departureCity, dest.name);
    if (distanceData) {
      dest.distance = `~${distanceData.distanceKm} km (~${distanceData.durationHours} hours)`;
    }
  }

  return plan;
}
