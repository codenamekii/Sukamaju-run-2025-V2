"use client";

import { cn } from "@/lib/utils/cn";
import { motion } from "framer-motion";

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  time: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

interface TimelineProps {
  items: TimelineEvent[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="relative">
      {/* Garis tengah */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-12">
        {items.map((event, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="relative flex items-start"
          >
            {/* Titik/Icon */}
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center border-2 z-10",
                event.highlight
                  ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white"
                  : "bg-white border-blue-500 text-blue-500"
              )}
            >
              {event.icon}
            </div>

            {/* Konten */}
            <div
              className={cn(
                "ml-6 flex-1 rounded-xl p-6 shadow-md",
                event.highlight
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  : "bg-white"
              )}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <h3
                  className={cn(
                    "text-lg font-bold",
                    event.highlight ? "text-white" : "text-gray-800"
                  )}
                >
                  {event.date} — {event.title}
                </h3>
              </div>
              <p
                className={cn(
                  "mb-2",
                  event.highlight ? "text-white/90" : "text-gray-600"
                )}
              >
                {event.description}
              </p>
              <span
                className={cn(
                  "text-sm",
                  event.highlight ? "text-gray-200" : "text-gray-500"
                )}
              >
                {event.time}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}