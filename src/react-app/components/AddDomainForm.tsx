import React, { useState } from 'react';
import { addDomain } from '../services/api';

interface AddDomainFormProps {
    onDomainAdded: () => void;
}

const AddDomainForm: React.FC<AddDomainFormProps> = ({ onDomainAdded }) => {
    const [fqdn, setFqdn] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await addDomain(fqdn);
            setFqdn(''); // Clear form
            onDomainAdded(); // Notify parent to refresh list
        } catch (err: any) {
            setError(err.message || 'Failed to add domain');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="add-domain-form">
            <h3>Add New Domain</h3>
            {error && <p className="error-message">{error}</p>}
            <div>
                <label htmlFor="fqdn">FQDN:</label>
                <input type="text" id="fqdn" value={fqdn} onChange={(e) => setFqdn(e.target.value)} placeholder="e.g., example.com" required />
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Domain'}</button>
        </form>
    );
};
export default AddDomainForm;
