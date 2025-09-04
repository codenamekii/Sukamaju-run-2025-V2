"use client";

import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Bagaimana cara mendaftar SUKAMAJU RUN 2025?",
      answer: "Pendaftaran dapat dilakukan secara online melalui website resmi kami. Klik tombol 'Daftar Sekarang', pilih kategori lomba, isi formulir pendaftaran, dan lakukan pembayaran melalui metode yang tersedia.",
    },
    {
      question: "Apa saja kategori lomba yang tersedia?",
      answer: "Kami menyediakan 3 kategori: Fun Run 5K untuk pemula (Rp 180.000), Challenge Run 10K untuk pelari berpengalaman (Rp 230.000), dan Registrasi Komunitas dengan harga spesial untuk minimal 10 orang.",
    },
    {
      question: "Apa yang termasuk dalam race pack?",
      answer: "Race pack mencakup: Jersey eksklusif SUKAMAJU RUN 2025, BIB number, medali finisher, sertifikat elektronik, dan merchandise sponsor.",
    },
    {
      question: "Kapan dan dimana pengambilan race pack?",
      answer: "Pengambilan race pack dilakukan pada tanggal 14-15 November 2025, pukul 10:00-20:00 WITA. Lokasi akan diinformasikan melalui email dan WhatsApp yang terdaftar.",
    },
    {
      question: "Apakah ada batasan usia untuk peserta?",
      answer: "Kategori 5K: minimal usia 12 tahun. Kategori 10K: minimal usia 17 tahun. Peserta di bawah 18 tahun wajib menyertakan surat izin orang tua.",
    },
    {
      question: "Bagaimana jika saya tidak bisa hadir pada hari lomba?",
      answer: "Pendaftaran tidak dapat dibatalkan dan biaya pendaftaran tidak dapat dikembalikan. Namun, race pack tetap dapat diambil dengan menunjukkan bukti pendaftaran.",
    },
    {
      question: "Apakah ada cut-off time untuk lomba?",
      answer: "Ya, cut-off time untuk kategori 5K adalah 1.5 jam dan untuk kategori 10K adalah 2 jam setelah start.",
    },
    {
      question: "Bagaimana sistem pembayaran pendaftaran?",
      answer: "Pembayaran dapat dilakukan melalui transfer bank, virtual account, QRIS, atau e-wallet. Setelah registrasi, Anda akan mendapatkan invoice dengan instruksi pembayaran.",
    },
    {
      question: "Apakah tersedia water station di sepanjang rute?",
      answer: "Ya, water station tersedia setiap 2-2.5km di sepanjang rute untuk kedua kategori lomba.",
    },
    {
      question: "Bagaimana cara mendapatkan sertifikat dan foto lomba?",
      answer: "Sertifikat elektronik akan dikirim melalui email maksimal 7 hari setelah event. Foto official akan tersedia di website dan dapat diunduh gratis.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center text-white hover:text-secondary transition">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </Link>
            <h1 className="text-xl font-bold">SUKAMAJU RUN 2025</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 text-center">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600 text-center mb-12">
            Temukan jawaban untuk pertanyaan umum seputar SUKAMAJU RUN 2025
          </p>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-800 pr-4">
                    {faq.question}
                  </h3>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>

                {openIndex === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-12 bg-gradient-to-r from-primary to-torea-bay rounded-xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              Masih ada pertanyaan?
            </h2>
            <p className="mb-6 text-white/90">
              Jangan ragu untuk menghubungi kami melalui WhatsApp atau email
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://wa.me/6285890031215"
                className="btn bg-secondary text-tangaroa hover:bg-secondary-600 hover:text-white"
              >
                WhatsApp Kami
              </a>
              <a
                href="mailto:info@sukamajurun.com"
                className="btn bg-white/20 text-white hover:bg-white/30 backdrop-blur"
              >
                Email Kami
              </a>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Sudah siap untuk mendaftar?
            </p>
            <Link href="/registration" className="btn-primary">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}