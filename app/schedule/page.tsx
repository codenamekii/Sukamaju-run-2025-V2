import { Timeline } from "@/components/ui/timeline";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import Link from "next/link";

export default function SchedulePage() {
  const timeline = [
    {
      date: "1 Juli 2025",
      title: "Pembukaan Registrasi",
      description: "Pendaftaran online dibuka untuk semua kategori",
      icon: <Calendar className="w-6 h-6" />,
      time: "00:00 WITA",
    },
    {
      date: "31 Agustus 2025",
      title: "Early Bird Berakhir",
      description: "Periode harga spesial early bird berakhir",
      icon: <Clock className="w-6 h-6" />,
      time: "23:59 WITA",
    },
    {
      date: "31 Oktober 2025",
      title: "Penutupan Registrasi",
      description: "Pendaftaran online ditutup",
      icon: <Calendar className="w-6 h-6" />,
      time: "23:59 WITA",
    },
    {
      date: "14 November 2025",
      title: "Pengambilan Racepack Hari 1",
      description: "Mulai pengambilan racepack di lokasi",
      icon: <MapPin className="w-6 h-6" />,
      time: "10:00 - 20:00 WITA",
    },
    {
      date: "15 November 2025",
      title: "Pengambilan Racepack Hari 2",
      description: "Hari terakhir pengambilan racepack",
      icon: <MapPin className="w-6 h-6" />,
      time: "10:00 - 20:00 WITA",
    },
    {
      date: "16 November 2025",
      title: "RACE DAY",
      description: "Hari perlombaan SUKAMAJU RUN 2025",
      icon: <Calendar className="w-6 h-6" />,
      time: "06:00 WITA",
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center text-white">
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
            Schedule Event
          </h1>
          <p className="text-gray-600 text-center mb-12">
            Timeline lengkap SUKAMAJU RUN 2025
          </p>

          {/* Timeline */}
          <Timeline items={timeline} />

          {/* CTA */}
          <div className="text-center mt-12">
            <Link href="/registration" className="btn-primary">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}