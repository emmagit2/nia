import { Link } from "react-router-dom";
import { ArrowRight, Zap, Shield, Clock, Star, ChevronRight } from "lucide-react";
import Navbar from "../components/Navbar";

const SAMPLES = [
  {
    label: "Logo Design",
    img: "https://images.pexels.com/photos/3182781/pexels-photo-3182781.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    label: "Flyer",
    img: "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    label: "Social Post",
    img: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    label: "Business Card",
    img: "https://images.pexels.com/photos/6457521/pexels-photo-6457521.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
];

const FEATURES = [
  {
    icon: <Zap size={20} className="text-[#FFD700]" />,
    title: "One Credit, One Design",
    desc: "No confusing pricing. 1 credit = 1 professional design delivered instantly.",
  },
  {
    icon: <Clock size={20} className="text-[#FFD700]" />,
    title: "Ready in 30 Seconds",
    desc: "AI dey cook your design fast fast. No need to wait for designer.",
  },
  {
    icon: <Shield size={20} className="text-[#FFD700]" />,
    title: "Pay with Paystack",
    desc: "Secure Nigerian payment. Use your debit card, bank transfer, USSD.",
  },
  {
    icon: <Star size={20} className="text-[#FFD700]" />,
    title: "Professional Quality",
    desc: "High-quality 4K designs that go with your brand. Better pass Canva.",
  },
];

const TESTIMONIALS = [
  {
    name: "Emeka O.",
    role: "Barbershop Owner, Lagos",
    text: "OgaDesigner help me create my shop logo in one minute. E come out sharp! My customers don dey ask who design am.",
    stars: 5,
  },
  {
    name: "Tunde A.",
    role: "Fashion Designer, Abuja",
    text: "I use am for my Instagram promo flyers. The AI understand Lagos style. Na serious tool be this.",
    stars: 5,
  },
  {
    name: "Chidi N.",
    role: "Restaurant Owner, PH",
    text: "The Hustler plan worth every kobo. 70 credits last me well well for the month.",
    stars: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-20 md:pt-24 md:pb-32">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, #FFD700, transparent)",
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <Zap size={12} />
            AI Design Tool Built for Nigerian Businessmen
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Design Like a{" "}
            <span className="text-[#FFD700]">Boss</span>
            {" "}—{" "}
            <br className="hidden sm:block" />
            No Designer Needed
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Create professional logos, flyers, social media posts, and business cards with AI.
            Just describe your business and AI go handle the rest. <span className="text-white font-medium">No worry, AI got you.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth" className="btn-gold flex items-center justify-center gap-2 text-base">
              Start Designing Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/pricing" className="btn-outline-gold flex items-center justify-center gap-2 text-base">
              See Pricing
            </Link>
          </div>

          <p className="text-gray-600 text-sm mt-6">
            No credit card required to sign up
          </p>
        </div>
      </section>

      {/* Sample designs */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-gray-500 text-sm mb-6 uppercase tracking-wider">
            Examples of what you can create
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SAMPLES.map((s) => (
              <div key={s.label} className="relative group overflow-hidden rounded-xl">
                <img
                  src={s.img}
                  alt={s.label}
                  className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <span className="text-white text-xs font-semibold">{s.label}</span>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-[#FFD700] text-[#0A0A0A] text-xs font-bold px-2 py-1 rounded-full">
                    1 Credit
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white text-center mb-3">
            How OgaDesigner Works
          </h2>
          <p className="text-gray-400 text-center mb-12">
            3 steps to get your professional design
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Describe Your Business",
                desc: "Tell the AI your business name, type of design you need, and style you want.",
              },
              {
                step: "02",
                title: "AI Dey Cook",
                desc: "Our AI uses your description to generate a professional design in seconds.",
              },
              {
                step: "03",
                title: "Download & Use",
                desc: "Your design is ready in 4K. Download and use it anywhere — social media, print, everywhere.",
              },
            ].map((item) => (
              <div key={item.step} className="card-dark p-6 relative">
                <span className="text-[#FFD700]/20 font-display font-bold text-5xl absolute top-4 right-4">
                  {item.step}
                </span>
                <h3 className="font-display font-bold text-white text-lg mb-2 pr-12">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20 bg-[#0D0D0D]">
        <div className="max-w-4xl mx-auto py-16">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white text-center mb-12">
            Why Nigerian Businessmen Choose OgaDesigner
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-10 h-10 bg-[#FFD700]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white text-center mb-12">
            What Nigerian Businessmen Are Saying
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card-dark p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} className="text-[#FFD700] fill-[#FFD700]" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                  "{t.text}"
                </p>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card-dark p-10 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at center, #FFD700, transparent)",
              }}
            />
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4 relative">
              Ready to Design Like a Boss?
            </h2>
            <p className="text-gray-400 mb-8 relative">
              Join thousands of Nigerian businessmen using AI to grow their brand.
            </p>
            <Link to="/pricing" className="btn-gold inline-flex items-center gap-2 text-base relative">
              View Plans & Pricing
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2E2E2E] px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FFD700] rounded flex items-center justify-center">
              <span className="text-[#0A0A0A] font-bold text-xs">O</span>
            </div>
            <span className="font-display font-bold text-sm text-white">
              Oga<span className="text-[#FFD700]">Designer</span>
            </span>
          </div>
          <p className="text-gray-600 text-sm">
            © 2024 OgaDesigner. Built for Nigerian Businessmen.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/auth" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
