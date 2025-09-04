"use client";

import { ArrowRight, Calendar, ChevronRight, Clock, Facebook, Instagram, Mail, MapPin, Menu, Phone, Trophy, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Navbar Component
function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-white shadow-lg" : "glass"
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-bold text-xl">
            <span className={isScrolled ? "text-primary" : "text-white"}>
              SUKAMAJU RUN 2025
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className={`transition ${isScrolled ? "text-gray-700 hover:text-primary" : "text-white/90 hover:text-secondary"}`}>
              Home
            </Link>
            <Link href="/schedule" className={`transition ${isScrolled ? "text-gray-700 hover:text-primary" : "text-white/90 hover:text-secondary"}`}>
              Schedule
            </Link>
            <Link href="/route" className={`transition ${isScrolled ? "text-gray-700 hover:text-primary" : "text-white/90 hover:text-secondary"}`}>
              Route
            </Link>
            <Link href="/faq" className={`transition ${isScrolled ? "text-gray-700 hover:text-primary" : "text-white/90 hover:text-secondary"}`}>
              FAQ
            </Link>
            <Link href="/registration" className="btn-secondary text-sm">
              Daftar Sekarang
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden ${isScrolled ? "text-primary" : "text-white"}`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <Link href="/" className="block text-gray-700 hover:text-primary transition">Home</Link>
            <Link href="/schedule" className="block text-gray-700 hover:text-primary transition">Schedule</Link>
            <Link href="/route" className="block text-gray-700 hover:text-primary transition">Route</Link>
            <Link href="/faq" className="block text-gray-700 hover:text-primary transition">FAQ</Link>
            <Link href="/registration" className="block btn-secondary text-center">Daftar Sekarang</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// Countdown Timer Component
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({
    Hari: 0,
    Jam: 0,
    Menit: 0,
    Detik: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          Hari: Math.floor(distance / (1000 * 60 * 60 * 24)),
          Jam: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          Menit: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          Detik: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center">
          <div className="glass rounded-xl p-4">
            <div className="text-3xl md:text-4xl font-bold text-secondary">
              {value.toString().padStart(2, "0")}
            </div>
            <div className="text-xs md:text-sm text-white/80 uppercase mt-1">
              {unit}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-tangaroa text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">SUKAMAJU RUN 2025</h3>
            <p className="text-white/80">Melangkah Bersama, Merangkul Perbedaan</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/schedule" className="hover:text-secondary transition">Schedule</Link></li>
              <li><Link href="/route" className="hover:text-secondary transition">Route Info</Link></li>
              <li><Link href="/registration" className="hover:text-secondary transition">Registration</Link></li>
              <li><Link href="/faq" className="hover:text-secondary transition">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                <span>085890031215</span>
              </li>
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                <span>info@sukamajurun.com</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://instagram.com/sukamajurun2025" className="hover:text-secondary transition">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="https://facebook.com/sukamajurun2025" className="hover:text-secondary transition">
                <Facebook className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-white/60">
          <p>&copy; made with ⚡ by <a href="https://kiiiii.netlify.app/">Taufiqurrahman</a>. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// WhatsApp CTA Component
function WhatsAppCTA() {
  return (
    <a
      href="https://wa.me/+6285890031215"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-all duration-300 hover:scale-110 z-40"
      aria-label="Contact via WhatsApp"
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
    </a>
  );
}

// Main Homepage Component
export default function HomePage() {
  const targetDate = new Date("2025-11-16T06:00:00+08:00"); // 06:00 WITA

  const eventInfo = [
    { icon: <Clock className="w-5 h-5" />, label: "Waktu", value: "16 Nov 2025, 06:00 WITA" },
    { icon: <MapPin className="w-5 h-5" />, label: "Lokasi", value: "Lapangan Subiantoro, Sukamaju" },
    { icon: <Users className="w-5 h-5" />, label: "Target Peserta", value: "500 Pelari" },
    { icon: <Trophy className="w-5 h-5" />, label: "Total Hadiah", value: "Jutaan Rupiah" },
  ];

  const scheduleCards = [
    {
      title: "Masa Registrasi",
      date: "1 September - 5 Oktober 2025",
      description: "Pendaftaran online dibuka untuk semua kategori",
      icon: <Calendar className="w-6 h-6" />,
    },
    {
      title: "Pengambilan Racepack",
      date: "14 - 15 November 2025",
      description: "Ambil racepack di lokasi yang telah ditentukan",
      icon: <Users className="w-6 h-6" />,
    },
    {
      title: "Race Day",
      date: "16 November 2025",
      description: "Hari perlombaan dimulai pukul 06:00 WITA",
      icon: <Trophy className="w-6 h-6" />,
    },
  ];

  const categories = [
    {
      title: "5K Umum",
      price: "Rp 180.000",
      description: "Cocok untuk pemula",
      benefits: ["Jersey eksklusif", "Medali finisher", "Sertifikat", "refreshment", "e-certificate"],
      color: "from-primary to-torea-bay",
      popular: true,
    },
    {
      title: "10K Professional",
      price: "Rp 230.000",
      description: "Untuk pelari berpengalaman",
      benefits: ["Jersey premium", "Medali eksklusif", "Race pack premium", "Refreshment++", "e-certificate"],
      color: "from-secondary to-accent",
    },
    {
      title: "Komunitas",
      price: "Special Price",
      description: "Min. 5 Runners",
      benefits: ["Diskon khusus", "Tent komunitas", "Photo booth", "e-certificate komunitas"],
      color: "from-waikawa-gray to-ship-cove",
    },
  ];

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center aurora-bg">
        <div className="absolute inset-0 bg-black/20" />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='0.5' opacity='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
        }} />

        <div className="container relative z-10 mx-auto px-4 text-center py-20">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 animate-fade-up">
            SUKAMAJU RUN 2025
          </h1>
          <p className="text-2xl md:text-3xl text-secondary font-semibold mb-12 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            Melangkah Bersama, Merangkul Perbedaan
          </p>

          {/* Countdown */}
          <div className="mb-12 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <p className="text-white/80 text-lg mb-4">Event dimulai dalam:</p>
            <CountdownTimer targetDate={targetDate} />
          </div>

          {/* Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-12">
            {eventInfo.map((info, index) => (
              <div
                key={index}
                className="glass rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 animate-fade-up"
                style={{ animationDelay: `${0.6 + index * 0.1}s` }}
              >
                <div className="flex items-center justify-center text-secondary mb-2">
                  {info.icon}
                </div>
                <h3 className="text-white/80 text-sm mb-1">{info.label}</h3>
                <p className="text-white font-semibold">{info.value}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "1s" }}>
            <Link href="/registration" className="btn-secondary group">
              Daftar Sekarang
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/schedule" className="btn-outline border-secondary text-secondary hover:bg-secondary hover:text-tangaroa hover:border-secondary">
              Lihat Jadwal
            </Link>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Jadwal Penting
            </h2>
            <p className="text-gray-600 text-lg">Catat tanggal-tanggal penting ini</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {scheduleCards.map((card, index) => (
              <div key={index} className="card-hover group">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-torea-bay rounded-lg text-white mb-4 group-hover:scale-110 transition-transform">
                    {card.icon}
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-2">{card.title}</h3>
                  <p className="text-secondary font-semibold mb-2">{card.date}</p>
                  <p className="text-gray-600">{card.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Pilih Kategori Lomba
            </h2>
            <p className="text-gray-600 text-lg">
              Daftar sekarang dan dapatkan early bird price!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {categories.map((category, index) => (
              <div key={index} className="card-hover relative">
                {category.popular && (
                  <div className="absolute -top-3 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                    POPULAR
                  </div>
                )}
                <div className={`h-2 bg-gradient-to-r ${category.color}`} />
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {category.title}
                  </h3>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {category.price}
                  </div>
                  <p className="text-gray-600 mb-4">{category.description}</p>
                  <ul className="space-y-2 mb-6">
                    {category.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start">
                        <ChevronRight className="w-4 h-4 text-secondary mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/registration"
                    className={`w-full ${category.popular ? "btn-primary" : "btn-outline"}`}
                  >
                    Daftar Sekarang
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-torea-bay">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Siap untuk Berlari?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Bergabunglah dengan 500 pelari lainnya dalam event lari terbesar di Sukamaju.
          </p>
          <Link href="/registration" className="btn bg-secondary text-tangaroa hover:bg-secondary-600 hover:text-white px-8 py-4 text-lg font-bold">
            Daftar Sekarang
          </Link>
        </div>
      </section>

      <Footer />
      <WhatsAppCTA />
    </>
  );
}