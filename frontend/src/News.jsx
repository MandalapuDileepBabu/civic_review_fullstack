import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "./Header";  // adjust path if necessary

const newsTopics = [
  {
    id: "water",
    title: "Water Pollution",
    description: "Efforts to keep water bodies clean and safe.",
    image:
      "https://static.wixstatic.com/media/c2bed181787047f0854890bb489c9662.jpg/v1/fill/w_1000,h_667,al_c,q_85,usm_0.66_1.00_0.01/c2bed181787047f0854890bb489c9662.jpg",
    newsUrl: "/news/water",
  },
  {
    id: "roads",
    title: "Road Cleaning",
    description: "Community working together for safer, cleaner roads.",
    image: "https://dlsdc.com/wp-content/uploads/2019/04/Earth_Day_Blog-scaled.jpg",
    newsUrl: "/news/roads",
  },
  {
    id: "electricity",
    title: "Electricity Supply",
    description: "Reliable and sustainable power solutions.",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    newsUrl: "/news/electricity",
  },
  {
    id: "air",
    title: "Air Quality",
    description: "Monitoring and improving the air we breathe.",
    image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80",
    newsUrl: "/news/air",
  },
  {
    id: "cleanliness",
    title: "Municipal Cleanliness",
    description: "Keeping our neighborhoods clean and healthy.",
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=600&q=80",
    newsUrl: "/news/cleanliness",
  },
];

const News = () => {
  const [flippedCard, setFlippedCard] = useState(null);

  return (
    <>
      {/* Include header and hide the News button */}
      <Header hideNewsButton={true} />

      <section
        id="news"
        style={{
          width: "100vw",
          padding: "80px 60px",
          backgroundColor: "#283e4a",
          borderRadius: 8,
          boxShadow: "none",
          color: "#eee",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            color: "#aed8f0",
            marginBottom: 40,
            textAlign: "center",
            fontWeight: "700",
            fontSize: "2rem",
            userSelect: "none",
          }}
        >
          Explore News by Topic
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
            justifyItems: "center",
            userSelect: "none",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {newsTopics.map((topic) => (
            <Link
              to={topic.newsUrl}
              key={topic.id}
              onMouseEnter={() => setFlippedCard(topic.id)}
              onMouseLeave={() => setFlippedCard(null)}
              onFocus={() => setFlippedCard(topic.id)}
              onBlur={() => setFlippedCard(null)}
              aria-label={`View latest news about ${topic.title}`}
              style={{
                perspective: 1000,
                cursor: "pointer",
                textDecoration: "none",
                outline: "none",
                display: "block",
                borderRadius: 12,
                width: "100%",
                position: "relative",
                paddingTop: "114.29%", // aspect ratio 4:3.5
                color: "#eee",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 12,
                  boxShadow: flippedCard === topic.id
                    ? "0 6px 18px rgba(0,0,0,0.50)"
                    : "0 2px 8px rgba(0,0,0,0.2)",
                  textAlign: "center",
                  transition: "transform 1s cubic-bezier(.4,0,.2,1), box-shadow 0.3s ease",
                  transformStyle: "preserve-3d",
                  transform: flippedCard === topic.id ? "rotateY(180deg)" : "rotateY(0deg)",
                  backgroundColor: "#1f3446",
                }}
              >
                {/* Front Side */}
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    borderRadius: 12,
                    backfaceVisibility: "hidden",
                    overflow: "hidden",
                    backgroundColor: "#364d69",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    boxShadow: "inset 0 -50px 50px -25px rgba(0,0,0,0.7)",
                  }}
                >
                  <img
                    src={topic.image}
                    alt={topic.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 12,
                    }}
                    draggable={false}
                  />
                  <h3
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      margin: 0,
                      color: "#fff",
                      backgroundColor: "rgba(0,0,0,0.7)",
                      padding: "8px 8px",
                      borderRadius: "0 0 12px 12px",
                      fontWeight: 700,
                      fontSize: "1.2rem",
                      textAlign: "center",
                    }}
                  >
                    {topic.title}
                  </h3>
                </div>

                {/* Back Side */}
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    borderRadius: 12,
                    backgroundColor: "#2a3d56",
                    color: "#ddd",
                    padding: 20,
                    transform: "rotateY(180deg)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                >
                  <p style={{ fontSize: "1rem", marginBottom: "auto" }}>{topic.description}</p>
                  <p
                    style={{
                      marginTop: 12,
                      fontWeight: 600,
                      color: "#aad4f5",
                      textDecoration: "underline",
                    }}
                  >
                    Click to read latest news
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
};

export default News;
