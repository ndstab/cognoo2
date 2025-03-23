# Cogno Application

This is a full-stack application with:
- Backend: Node.js/Express on Microsoft Azure
- Frontend: Next.js on Vercel

## Project Structure

The project is cleanly divided into two folders:

- **backend/** - Express server with Socket.io for real-time communication
- **frontend/** - Next.js application for the client

## Deployment Instructions

### Backend Deployment on Azure

1. Create an Azure account if you don't have one.
2. Install Azure CLI and log in:
   ```
   az login
   ```

3. Create an Azure Web App:
   ```
   az group create --name cogno-resource-group --location eastus
   az appservice plan create --name cogno-service-plan --resource-group cogno-resource-group --sku B1 --is-linux
   az webapp create --resource-group cogno-resource-group --plan cogno-service-plan --name cogno-backend --runtime "NODE|18-lts"
   ```

4. Configure environment variables in Azure:
   ```
   az webapp config appsettings set --resource-group cogno-resource-group --name cogno-backend --settings PORT=8080 OPENAI_API_KEY=your_key TAVILY_API_KEY=your_key MONGO_URI=your_uri JWT_SECRET=your_secret FRONTEND_URL=your_vercel_url
   ```

5. Deploy backend code to Azure:
   ```
   cd backend
   zip -r ../backend.zip .
   az webapp deployment source config-zip --resource-group cogno-resource-group --name cogno-backend --src ../backend.zip
   ```

   Alternatively, you can use Git deployment:
   ```
   cd backend
   git init
   git add .
   git commit -m "Initial backend deployment"
   
   # Add Azure as remote
   az webapp deployment source config-local-git --resource-group cogno-resource-group --name cogno-backend
   git remote add azure <git_url_from_previous_command>
   git push azure main
   ```

### Frontend Deployment on Vercel

1. Create a Vercel account if you don't have one.
2. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

3. Deploy the frontend:
   ```
   cd frontend
   vercel login
   vercel
   ```

4. Set environment variables in Vercel:
   - Go to your project on Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add the following variables:
     - NEXT_PUBLIC_BACKEND_URL=https://your-azure-backend.azurewebsites.net
     - NEXT_PUBLIC_SOCKET_URL=https://your-azure-backend.azurewebsites.net
     - NEXTAUTH_URL=https://your-vercel-app.vercel.app
     - GOOGLE_CLIENT_ID=your_google_client_id
     - GOOGLE_CLIENT_SECRET=your_google_client_secret
     - NEXTAUTH_SECRET=your_nextauth_secret
     - OPENAI_API_KEY=your_openai_api_key

5. Redeploy with production settings:
   ```
   vercel --prod
   ```

## Testing the Deployment

1. Visit your Vercel frontend URL
2. Check if the application connects to the Azure backend
3. Test chat features, user authentication, and other functionality

## Key Points for Production

1. **Environment Variables**: Make sure sensitive information is stored in environment variables, not in code
2. **CORS Configuration**: Ensure backend allows connections from your Vercel domain
3. **Socket.io**: Make sure WebSocket connections work through potential firewalls
4. **Database**: Monitor database performance and scale as needed
5. **Error Handling**: Implement proper logging and error reporting

## Troubleshooting

- Check Azure logs:
  ```
  az webapp log tail --resource-group cogno-resource-group --name cogno-backend
  ```

- Check Vercel logs through the Vercel dashboard or CLI:
  ```
  vercel logs
  ```

## Additional Information

- Azure Web App documentation: https://docs.microsoft.com/en-us/azure/app-service/
- Vercel documentation: https://vercel.com/docs
# Updated to stable version
