-- ENGINE//OS Migration 202611080002: Seed Canonical Services Registry (10 Categories, 12 Offers)
-- Platform: NOTREAL ENGINE, LLC

INSERT INTO public.services (id, category_id, slug, name, summary, sales_mode, active, canonical, display_order) VALUES
('SVC-01-SPW','website-development','single-page-website-development','Single Page Website Development','A focused one-page website with a maximum of five sections.','quote_required',true,true,1),
('SVC-02-MIN','website-development','mini-website-development','Mini Website Development','A compact one-page website with a maximum of eight sections.','quote_required',true,true,2),
('SVC-03-BIZ','website-development','business-website-development','Business Website Development','A structured multi-page website.','quote_required',true,true,3),
('SVC-04-FUN','sales-funnel-development','sales-funnel-development','Sales Funnel Development','A measured landing and qualification journey.','quote_required',true,true,4),
('SVC-05-EFC','ecommerce-fcommerce','ecommerce-fcommerce-store-development','E-commerce / F-commerce Store Development','A selling system with catalogue, checkout, and order workflow.','quote_required',true,true,5),
('SVC-06-WAP','web-application-development','custom-web-application-development','Custom Web Application Development','An authenticated browser-based business application.','quote_required',true,true,6),
('SVC-07-PWA','progressive-web-app-development','pwa-development','PWA Development','An installable web application with an offline strategy.','quote_required',true,true,7),
('SVC-08-MOB','mobile-app-development','android-ios-mobile-app-development','Android & iOS Mobile App Development','A secure mobile application for Android and iOS.','quote_required',true,true,8),
('SVC-09-CSE','custom-software-engineering','custom-software-full-stack-development','Custom Software & Full-Stack Development','A complex full-stack engineering engagement.','quote_required',true,true,9),
('SVC-10-MVP','mvp-saas-engineering','mvp-saas-development','MVP & SaaS Development','A staged production-capable product build.','quote_required',true,true,10),
('SVC-11-BMS','business-management-systems','business-dashboard-order-management-system','Business Dashboard & Order Management System','An internal operations and order control surface.','quote_required',true,true,11),
('SVC-12-BCP','client-platforms','branded-client-portal-development','Branded Client Portal Development','A private organization-scoped client area.','quote_required',true,true,12)
ON CONFLICT (id) DO UPDATE SET 
  category_id = excluded.category_id,
  slug = excluded.slug,
  name = excluded.name,
  summary = excluded.summary,
  sales_mode = excluded.sales_mode,
  display_order = excluded.display_order;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.packages WHERE service_id = 'SVC-01-SPW' AND name = 'Launch Promotion') THEN
    INSERT INTO public.packages (service_id, name, status, active, orderable, approval_metadata)
    VALUES ('SVC-01-SPW', 'Launch Promotion', 'pending_approval', false, false, jsonb_build_object('recorded_amount_bdt', 999, 'note', 'Regular price, promotion duration, full package approval, and checkout readiness remain unresolved.'));
  END IF;
END $$;
