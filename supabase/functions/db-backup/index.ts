import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import nodemailer from "npm:nodemailer@6.9.13";

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Fetch system settings to check backup config
        const { data: settings, error: settingsErr } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 'global')
            .single();

        if (settingsErr || !settings) {
            throw new Error("Could not load system settings");
        }

        const frequency = settings.backup_frequency || 'weekly';
        const backupEmail = settings.backup_email;
        const lastBackupDateStr = settings.last_backup_date;

        if (!backupEmail) {
            return new Response(JSON.stringify({ msg: "No backup email configured." }), { headers: { "Content-Type": "application/json" } });
        }

        // Adjust for Egypt timezone (UTC+3)
        const now = new Date();
        const egyptTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        const todayStr = egyptTime.toISOString().split('T')[0];

        console.log("Starting database backup...");

        // Fetch all data
        const tables = ['profiles', 'units', 'bookings', 'expenses', 'subscriptions', 'system_settings'];
        const backupData: any = {};

        for (const table of tables) {
            const { data, error } = await supabase.from(table).select('*');
            if (error) throw error;
            backupData[table] = data;
        }

        const backupJson = JSON.stringify(backupData, null, 2);
        const buffer = new TextEncoder().encode(backupJson);

        // Send via Email
        const SMTP_USER = Deno.env.get('SMTP_USER') ?? "lastupdate0000@gmail.com";
        const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? "hdgh mydi kiji uqsg";

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        const subject = `Database Backup - Rental Manager - ${todayStr}`;
        const html = `
            <h2>Database Backup</h2>
            <p>Please find attached the database backup generated on ${todayStr}.</p>
            <p>Frequency configured: ${frequency}</p>
        `;

        const mailOptions = {
            from: `"Rental Manager Backup" <${SMTP_USER}>`,
            to: backupEmail,
            subject: subject,
            html: html,
            attachments: [
                {
                    filename: `rental_manager_backup_${todayStr}.json`,
                    content: buffer,
                    contentType: 'application/json'
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        // Update last_backup_date
        await supabase
            .from('system_settings')
            .update({ last_backup_date: todayStr })
            .eq('id', 'global');

        return new Response(JSON.stringify({ success: true, msg: "Backup sent successfully" }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err: any) {
        console.error("Function Error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
