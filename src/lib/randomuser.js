const RANDOMUSER_API_DEFAULT_URL = 'https://randomuser.me/api/?results=500';

export function fallbackUsers() {
    const users = [];
    const genders = ['male', 'female'];
    const countries = ['USA', 'Canada', 'UK', 'Australia', 'Germany'];
    const citiesByCountry = {
        'USA': ['New York', 'Los Angeles', 'Chicago'],
        'Canada': ['Toronto', 'Vancouver', 'Montreal'],
        'UK': ['London', 'Manchester', 'Birmingham'],
        'Australia': ['Sydney', 'Melbourne', 'Brisbane'],
        'Germany': ['Berlin', 'Munich', 'Hamburg']
    };

    for (let i = 0; i < 50; i++) {
        const gender = genders[Math.floor(Math.random() * genders.length)];
        const country = countries[Math.floor(Math.random() * countries.length)];
        const city = citiesByCountry[country][Math.floor(Math.random() * citiesByCountry[country].length)];
        const firstName = `Fallback${gender === 'male' ? 'M' : 'F'}${i}`;
        const lastName = `User${i}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@fallback.com`;
        const phone = `555-${String(1000 + i).padStart(4, '0')}`;
        const registrationDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 5); // Up to 5 years ago

        users.push({
            id: { value: `F${String(i).padStart(3, '0')}-${Math.random().toString(36).substring(2, 10).toUpperCase()}` },
            name: { first: firstName, last: lastName },
            email: email,
            phone: phone,
            location: { country: country, city: city },
            registered: { date: registrationDate.toISOString() },
            picture: { thumbnail: `https://randomuser.me/api/portraits/thumb/${gender === 'male' ? 'men' : 'women'}/${i % 100}.jpg` }
        });
    }
    return users;
}

export async function loadUsers(withMeta = false) {
    const sourceUrl = process.env.RANDOMUSER_API_URL || RANDOMUSER_API_DEFAULT_URL;
    let users = [];
    let fallbackUsed = false;
    let fetchedAt = null;

    try {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        users = data.results;
        fetchedAt = new Date().toISOString();
    } catch (error) {
        console.error('Error fetching users from API, using fallback data:', error.message);
        users = fallbackUsers();
        fallbackUsed = true;
        fetchedAt = new Date().toISOString(); // Still record when fallback was generated/used
    }

    if (withMeta) {
        return {
            users,
            fallbackUsed,
            sourceUrl,
            fetchedAt
        };
    }
    return users;
}

export function buildMetrics(users) {
    const metrics = {
        totalUsers: users.length,
        genders: {},
        countries: {},
        cities: {},
        averageRegistrationDaysAgo: 0,
        mostCommonCountry: { name: '', count: 0 },
        mostCommonCity: { name: '', count: 0 }
    };

    let totalRegistrationDays = 0;
    const now = new Date();

    for (const user of users) {
        // Genders
        metrics.genders[user.gender] = (metrics.genders[user.gender] || 0) + 1;

        // Countries
        const country = user.location.country;
        metrics.countries[country] = (metrics.countries[country] || 0) + 1;
        if (metrics.countries[country] > metrics.mostCommonCountry.count) {
            metrics.mostCommonCountry = { name: country, count: metrics.countries[country] };
        }

        // Cities
        const city = user.location.city;
        metrics.cities[city] = (metrics.cities[city] || 0) + 1;
        if (metrics.cities[city] > metrics.mostCommonCity.count) {
            metrics.mostCommonCity = { name: city, count: metrics.cities[city] };
        }

        // Average registration days ago
        const registeredDate = new Date(user.registered.date);
        const diffTime = Math.abs(now - registeredDate);
        totalRegistrationDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (metrics.totalUsers > 0) {
        metrics.averageRegistrationDaysAgo = Math.round(totalRegistrationDays / metrics.totalUsers);
    }

    return metrics;
}