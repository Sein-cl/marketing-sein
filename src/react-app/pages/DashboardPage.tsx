import React from 'react';
import AddDomainForm from '../components/AddDomainForm';
import DomainList from '../components/DomainList';

const DashboardPage: React.FC = () => {
    // A way to refresh domain list after adding a new one.
    // Could be a simple counter or a more complex state management trigger.
    const [refreshKey, setRefreshKey] = React.useState(0);

    const handleDomainAdded = () => {
        setRefreshKey(prevKey => prevKey + 1);
    };

    return (
        <div className="dashboard-page">
            <h2>Your Dashboard</h2>
            <AddDomainForm onDomainAdded={handleDomainAdded} />
            <DomainList key={refreshKey} /> {/* Use key to force re-fetch */}
        </div>
    );
};
export default DashboardPage;
