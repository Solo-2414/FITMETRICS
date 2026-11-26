import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const MEMBERSHIP_PLANS = [
    {
        tag: "DAILY PASS",
        duration: "Single Day",
        name: "Walk-in / Session",
        rate: "₱90",
        cycle: "/ session",
        studentRate: "₱70",
        features: [
            "Full day gym floor access",
            "Free locker use (bring lock)",
            "All strength & cardio machines",
        ],
        btnText: "Drop In Today",
        highlight: false,
        delay: "100",
    },
    {
        tag: "SHORT STAY",
        duration: "7 Days",
        name: "Weekly Pass",
        rate: "₱270",
        cycle: "/ 7 days",
        desc: "Ideal for travelers, short-term visitors, or targeted 1-week training camps.",
        features: [
            "Unlimited entries for 7 days",
            "Open Mon-Sat access",
            "Full equipment privileges",
        ],
        btnText: "Get Weekly Pass",
        highlight: false,
        delay: "200",
    },
    {
        tag: "FORTNIGHTLY",
        duration: "14 Days",
        name: "Two Weeks Pass",
        rate: "₱540",
        cycle: "/ 14 days",
        desc: "Consistent mid-term momentum for vacation breaks or exam seasons.",
        features: [
            "14 consecutive days access",
            "Free warm-up equipment",
            "No activation or signup fee",
        ],
        btnText: "Get 14-Day Pass",
        highlight: false,
        delay: "300",
    },
    {
        badge: "BEST VALUE",
        tag: "MOST POPULAR",
        duration: "30 Days",
        name: "Monthly Regular",
        rate: "₱990",
        cycle: "/ 30 days",
        studentRate: "₱750",
        features: [
            "Unrestricted 30-day floor access",
            "No lock-in contracts or auto-renewals",
            "Eligible for Coach Add-on plans",
        ],
        btnText: "Start Monthly Pass",
        highlight: true,
        delay: "400",
    },
];

export default function LandingPage() {
    return (
        <>
            <Navbar />

            <main>
                <section id="home" className="home text-center py-5">
                    <div className="top d-flex flex-wrap justify-content-center gap-3 mb-4">
                        <div
                            className="card-pill"
                            data-aos="fade-down"
                            data-aos-delay="100"
                        >
                            <i
                                className="fa-regular fa-clock me-1"
                                aria-hidden="true"
                            ></i>
                            Open Mon-Sat 7:00 AM - 9:00 PM &nbsp;Sun 3:00 PM -
                            9:00 PM
                        </div>
                        <div
                            className="card-pill"
                            data-aos="fade-down"
                            data-aos-delay="200"
                        >
                            <i
                                className="fa-solid fa-unlock me-1"
                                aria-hidden="true"
                            ></i>
                            No-lock contracts
                        </div>
                        <div
                            className="card-pill"
                            data-aos="fade-down"
                            data-aos-delay="300"
                        >
                            <i
                                className="fa-solid fa-users me-1"
                                aria-hidden="true"
                            ></i>
                            Friendly Community Coaching
                        </div>
                    </div>

                    <h1 data-aos="zoom-in" data-aos-duration="800">
                        Welcome to <span>Analyn's Fitness Gym</span>
                    </h1>
                    <p
                        className="mx-auto"
                        data-aos="fade-up"
                        data-aos-delay="200"
                    >
                        Your neighborhood space to train, build strength, and
                        achieve your personal fitness goals with friendly
                        coaching and community support.
                    </p>

                    <div
                        className="buttons my-4"
                        data-aos="fade-up"
                        data-aos-delay="300"
                    >
                        <a href="#membership-rates">
                            <button type="button" className="membership-plans">
                                <i
                                    className="fa-solid fa-money-bills"
                                    aria-hidden="true"
                                ></i>
                                View Membership Plans
                            </button>
                        </a>
                        <a href="#location">
                            <button type="button" className="visit-gym">
                                <i
                                    className="fa-solid fa-person-walking"
                                    aria-hidden="true"
                                ></i>
                                Visit Our Gym
                            </button>
                        </a>
                    </div>

                    <div
                        className="gym-info container px-0"
                        data-aos="zoom-in-up"
                        data-aos-delay="400"
                    >
                        <img
                            src="/gym-bg.jpg"
                            alt="Analyn's Fitness Gym interior and equipment floor"
                            className="img-fluid"
                        />
                        <div className="info flex-column flex-sm-row gap-3">
                            <div className="status">
                                <span className="status-dot"></span>
                                <div className="status-text">
                                    <p>Gym Floor Status</p>
                                    <h4>Open & Welcoming Walk-ins</h4>
                                </div>
                            </div>
                            <div className="services">
                                <div className="pass">
                                    <h4>Session Pass from</h4>
                                    <p>
                                        <span className="price">₱90</span>
                                        <span className="unit">/ student</span>
                                    </p>
                                </div>
                                <div
                                    className="divider d-none d-sm-block"
                                    aria-hidden="true"
                                ></div>
                                <div className="hydration-refill">
                                    <h4>Hydration Refill</h4>
                                    <p>
                                        <span className="price">₱10</span>
                                        <span className="unit">unlimited</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="about-us" className="about-us py-5">
                    <div className="container">
                        <div
                            className="about-header text-start mb-5"
                            data-aos="fade-right"
                        >
                            <span className="section-tag">
                                ABOUT OUR FACILITY
                            </span>
                            <h2>Simple workouts. Real results.</h2>
                            <p>
                                We built Analyn's Fitness Gym for everyday
                                people who want honest results without gym
                                intimidation. A welcoming, high-energy
                                environment.
                            </p>
                        </div>

                        <div className="row g-4">
                            <div
                                className="col-12 col-md-4"
                                data-aos="fade-right"
                                data-aos-delay="100"
                            >
                                <div className="card h-100 p-4">
                                    <div className="icon-box dumbbell">
                                        <i
                                            className="fa-solid fa-dumbbell"
                                            aria-hidden="true"
                                        ></i>
                                    </div>
                                    <h3>Free Weights & Power Training</h3>
                                    <p>
                                        Heavy-duty power racks, Olympic
                                        barbells, calibrated steel plates, and
                                        an extensive dumbbell array for compound
                                        movements and muscle hypertrophy.
                                    </p>
                                </div>
                            </div>

                            <div
                                className="col-12 col-md-4"
                                data-aos="fade-up"
                                data-aos-delay="200"
                            >
                                <div className="card h-100 p-4">
                                    <div className="icon-box runner">
                                        <i
                                            className="fa-solid fa-person-running"
                                            aria-hidden="true"
                                        ></i>
                                    </div>
                                    <h3>Functional Cardio Zone</h3>
                                    <p>
                                        Endurance treadmills, stationary spin
                                        cycles, and high-intensity interval
                                        conditioning zones optimized for
                                        mountain elevation endurance training.
                                    </p>
                                </div>
                            </div>

                            <div
                                className="col-12 col-md-4"
                                data-aos="fade-left"
                                data-aos-delay="300"
                            >
                                <div className="card h-100 p-4">
                                    <div className="icon-box group">
                                        <i
                                            className="fa-solid fa-user-group"
                                            aria-hidden="true"
                                        ></i>
                                    </div>
                                    <h3>Supportive Community Coaches</h3>
                                    <p>
                                        Guided by certified coaches Analyn and
                                        Mark. From zero-experience first-timers
                                        to seasoned lifters, you'll always have
                                        someone to spot, guide, and cheer you
                                        on.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="membership-rates"
                    className="membership-rates py-5"
                >
                    <div className="container">
                        <div
                            className="pricing-header text-center mb-5"
                            data-aos="zoom-in"
                        >
                            <span className="pricing">
                                STRAIGHTFORWARD PRICING
                            </span>
                            <h2>Membership Plans & Rates</h2>
                            <p className="mx-auto">
                                Pure straightforward gym floor & equipment
                                access for the selected period. No hidden locker
                                fees, no VIP lock-in, and zero complicated
                                contracts.
                            </p>
                        </div>

                        <div className="row g-4 mb-4">
                            {MEMBERSHIP_PLANS.map((plan, idx) => (
                                <div
                                    key={idx}
                                    className="col-12 col-md-6 col-lg-3"
                                    data-aos={
                                        plan.highlight ? "zoom-in" : "flip-left"
                                    }
                                    data-aos-delay={plan.delay}
                                >
                                    <div
                                        className={`card h-100 ${plan.highlight ? "highlight" : ""}`}
                                    >
                                        {plan.badge && (
                                            <div className="badge">
                                                {plan.badge}
                                            </div>
                                        )}
                                        <div className="membership-tag">
                                            <p>{plan.tag}</p>
                                            <span>{plan.duration}</span>
                                        </div>
                                        <h3>{plan.name}</h3>
                                        <p className="rate">
                                            <span>{plan.rate}</span>{" "}
                                            {plan.cycle}
                                        </p>
                                        {plan.studentRate && (
                                            <div className="student-rate">
                                                <i
                                                    className="fa-solid fa-graduation-cap"
                                                    aria-hidden="true"
                                                ></i>
                                                <p>
                                                    Student Rate:{" "}
                                                    <span>
                                                        {plan.studentRate}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                        {plan.desc && (
                                            <p className="card-desc">
                                                {plan.desc}
                                            </p>
                                        )}
                                        <ul>
                                            {plan.features.map(
                                                (feature, fIdx) => (
                                                    <li key={fIdx}>
                                                        <i
                                                            className="fa-regular fa-circle-check"
                                                            aria-hidden="true"
                                                        ></i>
                                                        {feature}
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                        <button type="button">
                                            {plan.btnText}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="notice mt-4" data-aos="fade-up">
                            <i
                                className="fa-solid fa-shield-halved"
                                aria-hidden="true"
                            ></i>
                            <p>
                                <strong>The FITMETRICS Guarantee:</strong> You
                                only pay for what you use. We will never sneak
                                in maintenance fees, mandatory annual dues, or
                                surprise auto-charges. Cash and GCash accepted
                                at the counter.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    id="personal-coaching"
                    className="personal-coaching py-5"
                >
                    <div className="container">
                        <span
                            className="section-tag d-block"
                            data-aos="fade-right"
                        >
                            AFFORDABLE ONE-ON-ONE MENTORSHIP
                        </span>
                        <h2 data-aos="fade-right" data-aos-delay="100">
                            Personal Floor Coach Guidance
                        </h2>
                        <p
                            className="mb-4"
                            data-aos="fade-right"
                            data-aos-delay="200"
                        >
                            New to the gym or breaking a plateau? Pair your
                            monthly pass with dedicated coaching for routine
                            formulation, proper lifting mechanics, and steady
                            beginner encouragement.
                        </p>

                        <div className="row g-4">
                            <div
                                className="col-12 col-md-6"
                                data-aos="slide-right"
                                data-aos-delay="100"
                            >
                                <div className="card h-100 p-4">
                                    <div className="coach-info">
                                        <img
                                            src="/placeholder.png"
                                            alt="Coach Alex"
                                        />
                                        <div className="coach">
                                            <span>Head Coach & Founder</span>
                                            <h3>Coach Alex</h3>
                                        </div>
                                    </div>
                                    <p>
                                        Specializes in beginner acclimation,
                                        mobility, safe functional strength
                                        progression, and form correction to keep
                                        workouts injury-free and energizing.
                                    </p>
                                    <div className="rate">
                                        <div className="description">
                                            <p>Floor Coaching Add-on</p>
                                            <p>
                                                Includes custom routine
                                                formulation & hands-on form
                                                checkins.
                                            </p>
                                        </div>
                                        <p>
                                            <span>+₱600</span> / month
                                        </p>
                                    </div>
                                    <div className="session-time">
                                        <i
                                            className="fa-regular fa-circle-check"
                                            aria-hidden="true"
                                        ></i>
                                        <p>
                                            Available for morning & afternoon
                                            sessions
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="col-12 col-md-6"
                                data-aos="slide-left"
                                data-aos-delay="200"
                            >
                                <div className="card h-100 p-4">
                                    <div className="coach-info">
                                        <img
                                            src="/placeholder.png"
                                            alt="Coach Vincent"
                                        />
                                        <div className="coach">
                                            <span>Strength Coach</span>
                                            <h3>Coach Vincent</h3>
                                        </div>
                                    </div>
                                    <p>
                                        Focuses on barbell mechanics (squat,
                                        bench, deadlift), hypertrophy
                                        foundations, progressive overload
                                        tracking, and athletic conditioning.
                                    </p>
                                    <div className="rate">
                                        <div className="description">
                                            <p>Floor Coaching Add-on</p>
                                            <p>
                                                Includes tailored weekly workout
                                                splits & direct lifting spots.
                                            </p>
                                        </div>
                                        <p>
                                            <span>+₱500</span> / month
                                        </p>
                                    </div>
                                    <div className="session-time">
                                        <i
                                            className="fa-regular fa-circle-check"
                                            aria-hidden="true"
                                        ></i>
                                        <p>
                                            Available for afternoon & evening
                                            sessions
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="location" className="location py-5">
                    <div className="container">
                        <div className="row g-4 align-items-stretch">
                            <div
                                className="col-12 col-lg-6 left"
                                data-aos="fade-right"
                            >
                                <span className="section-tag">
                                    VISIT OUR LOCATION
                                </span>
                                <h2>Hours & Front Desk</h2>
                                <p>
                                    Centrally accessible for people who live
                                    near San Jose, Batangas. Drop by directly—no
                                    reservations required.
                                </p>

                                <div
                                    className="hours mb-4"
                                    data-aos="zoom-in"
                                    data-aos-delay="200"
                                >
                                    <i
                                        className="fa-regular fa-circle-check"
                                        aria-hidden="true"
                                    ></i>
                                    <h3>Operating Hours</h3>
                                    <div className="schedule">
                                        <p>Monday – Saturday</p>
                                        <span>7:00 AM - 9:00 PM</span>
                                    </div>
                                    <hr />
                                    <div className="schedule">
                                        <p>Sunday</p>
                                        <span>3:00 PM - 9:00 PM</span>
                                    </div>
                                </div>

                                <div className="gym-info row g-3">
                                    <div
                                        className="col-12 col-sm-6"
                                        data-aos="fade-up"
                                        data-aos-delay="100"
                                    >
                                        <div className="card h-100">
                                            <i
                                                className="fa-solid fa-location-pin"
                                                aria-hidden="true"
                                            ></i>
                                            <div className="info">
                                                <span>Address</span>
                                                <address>
                                                    4th floor of the Less
                                                    Consumo building in San
                                                    Jose, Batangas right next to
                                                    the 7/11, San Jose,
                                                    Philippines, 4227
                                                </address>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="col-12 col-sm-6"
                                        data-aos="fade-up"
                                        data-aos-delay="200"
                                    >
                                        <div className="card h-100">
                                            <i
                                                className="fa-solid fa-phone"
                                                aria-hidden="true"
                                            ></i>
                                            <div className="info">
                                                <span>Direct Phone</span>
                                                <p>
                                                    <a href="tel:+639277943574">
                                                        +63 927 794 3574
                                                    </a>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="col-12 col-sm-6"
                                        data-aos="fade-up"
                                        data-aos-delay="300"
                                    >
                                        <div className="card h-100">
                                            <i
                                                className="fa-regular fa-envelope"
                                                aria-hidden="true"
                                            ></i>
                                            <div className="info">
                                                <span>Front Desk Email</span>
                                                <p>
                                                    <a href="mailto:analynfitnessgym@gmail.com">
                                                        analynfitnessgym@gmail.com
                                                    </a>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="col-12 col-sm-6"
                                        data-aos="fade-up"
                                        data-aos-delay="400"
                                    >
                                        <div className="card h-100">
                                            <i
                                                className="fa-solid fa-money-bills"
                                                aria-hidden="true"
                                            ></i>
                                            <div className="info">
                                                <span>Accepted Payments</span>
                                                <p>Cash · GCash · Maya</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="col-12 col-lg-6"
                                data-aos="fade-left"
                                data-aos-delay="300"
                            >
                                <img
                                    src="/gym-bg.jpg"
                                    alt="Analyn's Fitness Gym exterior location"
                                    className="img-fluid rounded-4 h-100 object-fit-cover w-100"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="hero-cta text-center py-5">
                    <div className="container" data-aos="zoom-in">
                        <div className="welcome mb-3">
                            <i
                                className="fa-solid fa-mobile-screen-button"
                                aria-hidden="true"
                            ></i>
                            <p className="m-0">Walk-ins always welcome</p>
                        </div>
                        <h2>Ready to start your fitness journey?</h2>
                        <p className="mx-auto">
                            Drop by our front desk anytime. No reservation
                            needed. Just wear your workout clothes and gym
                            shoes, get a day pass or student pass, and start
                            your workout.
                        </p>

                        <div className="cta-buttons d-flex justify-content-center gap-3 flex-wrap">
                            <a
                                href="#membership-rates"
                                className="btn-primary text-decoration-none"
                            >
                                <i
                                    className="fa-solid fa-desktop"
                                    aria-hidden="true"
                                ></i>
                                Check Pass Rates (From ₱70)
                            </a>
                            <a
                                href="tel:+639693665697"
                                className="btn-secondary"
                            >
                                <i
                                    className="fa-solid fa-phone"
                                    aria-hidden="true"
                                ></i>
                                Call Our Desk (+63 969 366 5697)
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </>
    );
}
