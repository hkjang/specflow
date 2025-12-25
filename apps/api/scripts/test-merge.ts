import axios from 'axios';

const API_URL = 'http://localhost:3001';
const jobId = 'acdbfd8f-9044-41af-a780-9915f9bc7e32'; // The ID related to the 404 error

async function testMerge() {
    try {
        console.log(`Testing POST ${API_URL}/extraction/jobs/${jobId}/merge`);
        const res = await axios.post(`${API_URL}/extraction/jobs/${jobId}/merge`);
        console.log('Success:', res.data);
    } catch (error: any) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error Message:', error.message);
        }
    }
}

testMerge();
